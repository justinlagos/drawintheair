import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Rss } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog — Draw in the Air',
  description: 'Tips, research, and insights for teachers using gesture-based learning in the classroom.',
}

const BLOG_POSTS = [
  {
    slug: 'gesture-learning-benefits',
    title: '5 Benefits of Gesture-Based Learning for Young Children',
    excerpt:
      'New research shows that whole-body movement during learning improves retention and engagement in early childhood education.',
    category: 'Research',
    date: 'March 2026',
    readTime: '4 min read',
    emoji: '🧠',
  },
  {
    slug: 'classroom-movement-guide',
    title: 'How to Integrate Movement Into Your Daily Classroom Routine',
    excerpt:
      'Practical tips for weaving gesture-based activities into your existing lesson plans without disrupting the curriculum.',
    category: 'Teaching Tips',
    date: 'February 2026',
    readTime: '6 min read',
    emoji: '🏫',
  },
  {
    slug: 'fine-motor-skills-technology',
    title: 'Using Technology to Build Fine Motor Skills in Reception',
    excerpt:
      'A guide for Reception and Year 1 teachers on using hand tracking games to develop pre-writing skills.',
    category: 'Early Years',
    date: 'February 2026',
    readTime: '5 min read',
    emoji: '✏️',
  },
  {
    slug: 'chromebook-learning',
    title: 'Getting the Most from Chromebooks in Your Classroom',
    excerpt:
      'How to set up gesture-based activities on Chromebooks and tablets for the whole class to enjoy.',
    category: 'Technology',
    date: 'January 2026',
    readTime: '3 min read',
    emoji: '💻',
  },
  {
    slug: 'engagement-strategies',
    title: '7 Ways to Boost Student Engagement with Interactive Learning',
    excerpt:
      'Tried-and-tested strategies from teachers who have seen dramatic improvements in classroom participation.',
    category: 'Teaching Tips',
    date: 'January 2026',
    readTime: '7 min read',
    emoji: '⭐',
  },
  {
    slug: 'send-inclusive-activities',
    title: 'Making Gesture Learning Inclusive for SEND Students',
    excerpt:
      'How draw in the air activities can be adapted for students with special educational needs and disabilities.',
    category: 'Inclusion',
    date: 'December 2025',
    readTime: '5 min read',
    emoji: '🤝',
  },
]

const CATEGORIES = ['All', 'Research', 'Teaching Tips', 'Early Years', 'Technology', 'Inclusion']

export default function BlogPage() {
  return (
    <div className="bg-slate-50">
      {/* Header */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-14 w-14 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center">
            <BookOpen className="h-7 w-7 text-orange-600" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
          The Draw in the Air Blog
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Research, teaching tips, and insights for educators using gesture-based learning.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <span
              key={cat}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                cat === 'All'
                  ? 'bg-orange-100 border-orange-300 text-orange-700'
                  : 'bg-slate-100 border-slate-300 text-slate-600 hover:border-orange-300 hover:text-slate-700'
              }`}
            >
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-orange-300 transition-all hover:shadow-lg shadow-sm"
            >
              <article>
                {/* Card Header with Emoji */}
                <div className="h-32 bg-orange-50 flex items-center justify-center">
                  <span className="text-5xl">{post.emoji}</span>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                      {post.category}
                    </span>
                    <span className="text-xs text-slate-500">{post.date}</span>
                  </div>

                  <h2 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-orange-600 transition-colors">
                    {post.title}
                  </h2>

                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">{post.readTime}</span>
                    <span className="text-xs font-medium text-orange-600 group-hover:text-orange-700 transition-colors">
                      Read article →
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-8 text-center space-y-6">
          <div className="flex justify-center">
            <Rss className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Stay in the loop</h3>
            <p className="mt-2 text-slate-600">
              Get new articles and teaching tips delivered to your inbox monthly.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@school.edu"
              className="flex-1 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-500 focus:border-orange-500 focus:outline-none text-sm"
            />
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
              Subscribe
            </Button>
          </div>
          <p className="text-xs text-slate-600">
            No spam, ever. Unsubscribe at any time. Read our{' '}
            <Link href="/privacy" className="text-slate-600 hover:text-slate-700 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
