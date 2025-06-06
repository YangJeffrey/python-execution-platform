import { getServerSession } from 'next-auth/next';
import prisma from '../../../lib/prisma';

// Import your NextAuth options
import { options } from '../auth/[...nextauth]';

// POST /api/post
// Required fields in body: title
// Optional fields in body: content
export default async function handle(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { title, content } = req.body;

  // Validate required fields
  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  try {
    const session = await getServerSession(req, res, options);

    // Check if user is authenticated
    if (!session || !session.user || !session.user.email) {
      return res.status(401).json({ message: 'You must be logged in to create a post' });
    }

    const result = await prisma.post.create({
      data: {
        title: title,
        content: content || null,
        author: { connect: { email: session.user.email } },
      },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
