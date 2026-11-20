"""Revalidate saved supplier snapshots through the normal canonical adapter."""
import json
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.catalog.services import defer_buyer_projection_refresh, invalidate_buyer_projection_cache
from apps.integration.catalog_config import validate_config
from apps.integration.catalog_import import ingest_rows
from apps.integration.catalog_sync import audit
from apps.integration.models import VendorCatalogConnection, VendorCatalogSyncRun


class Command(BaseCommand):
    help = 'Preview/replay saved source rows; no provider writes, downloads or forced activation.'

    def add_arguments(self, parser):
        parser.add_argument('--connection', required=True)
        parser.add_argument('--apply', action='store_true')
        parser.add_argument('--limit', type=int)
        parser.add_argument('--batch-size', type=int, default=100)

    def handle(self, *args, **options):
        if not 1 <= options['batch_size'] <= 200 or (options['limit'] is not None and options['limit'] < 1):
            raise CommandError('Use batch size 1–200 and a positive limit.')
        total = {key:0 for key in ('created_count','updated_count','unchanged_count','review_count','error_count')}
        with transaction.atomic(), defer_buyer_projection_refresh():
            try:
                connection = VendorCatalogConnection.objects.select_for_update().get(pk=options['connection'])
            except VendorCatalogConnection.DoesNotExist as error:
                raise CommandError('Connection not found.') from error
            if connection.sync_runs.filter(status__in=['queued','running','retrying']).exists():
                raise CommandError('Finish/cancel the existing active run before replaying saved sources.')
            validate_config(connection.config)
            actor = connection.updated_by or connection.created_by
            if actor is None or not actor.is_active:
                raise CommandError('An active connection owner is required.')
            run = VendorCatalogSyncRun.objects.create(connection=connection, requested_by=actor,
                config_version=connection.config_version, trigger='review', status='running', started_at=timezone.now())
            ids = connection.source_items.order_by('pk').values_list('pk',flat=True)
            ids = list(ids[:options['limit']] if options['limit'] else ids)
            images = 0
            for start in range(0,len(ids),options['batch_size']):
                rows = list(connection.source_items.filter(pk__in=ids[start:start+options['batch_size']]).order_by('pk'))
                counts, deferred = ingest_rows(connection, run, [row.payload for row in rows], actor)
                for key in total: total[key] += counts[key]
                images += len(deferred)
            for key, count in total.items(): setattr(run,key,count)
            run.rows_seen, run.status, run.completed_at = len(ids), 'completed', timezone.now()
            run.save()
            audit('saved_sources_replayed',connection,actor,run_id=run.pk,rows=len(ids),**total)
            if options['apply']:
                invalidate_buyer_projection_cache('supplier_source_replay')
            else:
                transaction.set_rollback(True)
        self.stdout.write(json.dumps({'applied':options['apply'],'rows':len(ids),**total,
            'images_require_separate_processing':images,'provider_requests':0}))
