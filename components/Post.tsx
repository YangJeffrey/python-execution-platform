import React from 'react';
import Router from 'next/router';
import { Card, Image, Text, Badge, Button, Group } from '@mantine/core';
import { IconFile } from '@tabler/icons-react';

export type PostProps = {
  id: string;
  title: string;
  author: {
    name: string;
    email: string;
  } | null;
  content: string;
};

const Post: React.FC<{ post: PostProps }> = ({ post }) => {
  const authorName = post.author ? post.author.name : 'Unknown author';

  return (
    <Card shadow="sm" padding="sm" radius="sm" withBorder className="gap-2">
      <Group gap="xs">
        <Text fw={500}>{post.title}</Text>
        {/* <Badge color="pink">{post.id}</Badge> */}
      </Group>
      {/* <Badge variant="default">Private code</Badge> */}
      <Badge variant="default" leftSection={<IconFile size={12} />}>
        script.py
      </Badge>
      <Button mt="lg" fullWidth radius="sm" onClick={() => Router.push('/p/[id]', `/p/${post.id}`)}>
        Run
      </Button>
    </Card>
  );
};

export default Post;
