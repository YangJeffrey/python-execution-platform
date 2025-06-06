import { getServerSession } from 'next-auth/next';
import prisma from '../../../lib/prisma';
import { options } from '../auth/[...nextauth]';

// DELETE /api/post/:id
// PUT /api/post/:id
export default async function handle(req, res) {
  const postId = req.query.id;

  if (req.method === 'DELETE') {
    const post = await prisma.post.delete({
      where: { id: postId },
    });
    res.json(post);
  } else if (req.method === 'PUT') {
    const { title, content } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    try {
      const session = await getServerSession(req, res, options);

      // Check if user is authenticated
      if (!session || !session.user || !session.user.email) {
        return res.status(401).json({ message: 'You must be logged in to edit a post' });
      }

      // Check if the post exists and belongs to the user
      const existingPost = await prisma.post.findUnique({
        where: { id: postId },
        include: { author: true },
      });

      if (!existingPost) {
        return res.status(404).json({ message: 'Post not found' });
      }

      if (existingPost.author?.email !== session.user.email) {
        return res.status(403).json({ message: 'You can only edit your own posts' });
      }

      const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: {
          title: title,
          content: content || null,
        },
        include: {
          author: {
            select: { name: true, email: true },
          },
        },
      });

      res.status(200).json(updatedPost);
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    throw new Error(`The HTTP ${req.method} method is not supported at this route.`);
  }
}
