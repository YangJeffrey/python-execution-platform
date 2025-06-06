import React, { ReactNode } from 'react';
import Header from './Header';
import { Flex } from '@mantine/core';

type Props = {
  children: ReactNode;
};

const Layout: React.FC<Props> = ({ children }) => {
  return (
    <div>
      <Header />
      <Flex direction="column" align="flex-start" p={10} w="100%" gap="sm">
        {children}
      </Flex>
    </div>
  );
};

export default Layout;
