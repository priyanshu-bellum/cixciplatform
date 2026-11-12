"""Client matrix controls must preserve the shared backend acceptance policy."""
import pytest
from django.core.exceptions import ValidationError
from apps.catalog.compatibility_values import normalized_wireless, validate_wireless_policy


def catalog(rules):
    return {"fields": {"wireless_charging_compatibility": [{"id": None, "value": value, "label": value} for value in ("MagSafe", "Qi", "Qi2", "Qi1", "Not Compatible")]}, "wireless_policy": rules}


def test_arbitrary_three_of_four_allowed_combination_and_new_prohibition_coexist():
    rules = {"allowed_combinations": [["MagSafe", "Qi", "Qi2"]], "prohibited_combinations": [["MagSafe", "Qi1"]]}
    options = catalog(rules)
    assert validate_wireless_policy(rules, options) == rules
    assert set(normalized_wireless("Qi2+MagSafe+Qi", options).split("+")) == {"MagSafe", "Qi", "Qi2"}
    with pytest.raises(ValidationError, match="prohibited"):
        normalized_wireless("MagSafe+Qi+Qi1", options)


@pytest.mark.parametrize("allowed,valid", [([], True), ([["Qi", "Qi2"]], False)])
def test_unlisted_multivalue_behavior_depends_on_existing_allowed_list(allowed, valid):
    options = catalog({"allowed_combinations": allowed, "prohibited_combinations": [["MagSafe", "Qi1"]]})
    if valid:
        assert normalized_wireless("Qi+Qi1", options) == "Qi+Qi1"
    else:
        with pytest.raises(ValidationError, match="allowed list"):
            normalized_wireless("Qi+Qi1", options)


def test_allowed_row_cannot_contain_a_prohibited_subset():
    rules = {"allowed_combinations": [["MagSafe", "Qi", "Qi2"]], "prohibited_combinations": [["Qi", "Qi2"]]}
    with pytest.raises(ValidationError, match="prohibited combination"):
        validate_wireless_policy(rules, catalog(rules))


def test_negative_wireless_answer_remains_exclusive_with_custom_policy():
    options = catalog({"allowed_combinations": [], "prohibited_combinations": []})
    assert normalized_wireless("Not Compatible", options) == "Not Compatible"
    with pytest.raises(ValidationError, match="cannot be combined"):
        normalized_wireless("Qi1+Not Compatible", options)
