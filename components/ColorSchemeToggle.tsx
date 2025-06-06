import { useState, useEffect } from 'react';
import { UnstyledButton, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div style={{ width: 40, height: 40 }} />; // reserve space to prevent layout shift
  }

  const Icon = colorScheme === 'dark' ? IconSun : IconMoon;

  return (
    <Tooltip
      label={colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}
      position="bottom"
      transitionProps={{ duration: 0 }}
    >
      <UnstyledButton
        onClick={toggleColorScheme}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          transition: 'background-color 0.2s',
        }}
        aria-label="Toggle colour scheme"
      >
        <Icon size={20} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}

export default ColorSchemeToggle;
