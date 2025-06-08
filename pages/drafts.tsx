import React from 'react';
import { GetServerSideProps } from 'next';
import { useSession, getSession } from 'next-auth/react';
import Layout from '../components/Layout';
import Post, { PostProps } from '../components/Post';
import prisma from '../lib/prisma';
import { Flex, SimpleGrid, Text } from '@mantine/core';

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession({ req });
  if (!session) {
    res.statusCode = 403;
    return { props: { drafts: [] } };
  }

  const drafts = await prisma.post.findMany({
    where: {
      author: { email: session.user.email },
    },
    include: {
      author: {
        select: { name: true },
      },
    },
  });
  return {
    props: { drafts },
  };
};

type Props = {
  drafts: PostProps[];
};

const Drafts: React.FC<Props> = (props) => {
  const { data: session } = useSession();

  if (!session) {
    return (
      <Layout>
        <Text fw={900} size="lg">
          Scripts
        </Text>
        <Text>You need to be authenticated to view this page.</Text>
      </Layout>
    );
  }

  return (
    <Layout>
      <Text fw={900} size="lg">
        New Script
      </Text>
      <SimpleGrid w="100%" cols={{ base: 1, sm: 2, lg: 4 }} p={0} spacing="md">
        {props.drafts.map((post) => (
          <div key={post.id}>
            <Post post={post} />
          </div>
        ))}
      </SimpleGrid>
    </Layout>
  );
};

export default Drafts;
