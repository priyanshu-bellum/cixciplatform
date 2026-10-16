import { useState, ReactNode, SyntheticEvent } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

interface TabDef {
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabPanelProps {
  tabs: TabDef[];
  initialTab?: number;
  onChange?: (index: number) => void;
}

export default function TabPanel({ tabs, initialTab = 0, onChange }: TabPanelProps) {
  const [value, setValue] = useState(initialTab);

  const handleChange = (_: SyntheticEvent, newValue: number) => {
    setValue(newValue);
    onChange?.(newValue);
  };

  return (
    <Box>
      <Tabs value={value} onChange={handleChange} variant="scrollable" scrollButtons="auto">
        {tabs.map((tab, i) => (
          <Tab key={i} label={tab.label} disabled={tab.disabled} />
        ))}
      </Tabs>
      <Box sx={{ pt: 2 }}>
        {tabs[value]?.content}
      </Box>
    </Box>
  );
}
