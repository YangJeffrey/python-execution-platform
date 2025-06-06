import React from 'react';
import { GetServerSideProps } from 'next';
import { getProviders, signIn, getSession } from 'next-auth/react';
import { Container, Paper, Title, Button, Stack, Center, Text } from '@mantine/core';
import { IconBrandGithub } from '@tabler/icons-react';
import Layout from '../components/Layout';

interface Provider {
  id: string;
  name: string;
  type: string;
}

interface SignInProps {
  providers: Record<string, Provider>;
}

const SignIn: React.FC<SignInProps> = ({ providers }) => {
  return (
    <Layout>
      <Container size="xs" style={{ display: 'flex', alignItems: 'center' }}>
        <Paper
          shadow="md"
          p="xl"
          radius="md"
          style={{
            width: '100%',
            border: '1px solid #e9ecef',
          }}
        >
          <Stack align="center" gap="md">
            <Title size="h2">Welcome Back</Title>
            <Text size="md">Sign in to your account to continue</Text>

            <Stack gap="md" style={{ width: '100%' }}>
              {Object.values(providers).map((provider) => (
                <Button
                  key={provider.name}
                  onClick={() => signIn(provider.id)}
                  size="lg"
                  leftSection={<IconBrandGithub size={20} />}
                  style={{
                    height: '50px',
                    fontSize: '16px',
                  }}
                  fullWidth
                >
                  Sign in with {provider.name}
                </Button>
              ))}
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (session) {
    return {
      redirect: {
        destination: '/drafts',
        permanent: false,
      },
    };
  }

  const providers = await getProviders();

  return {
    props: {
      providers: providers ?? {},
    },
  };
};

export default SignIn;
