import React, { useState } from 'react';
import { Users, Workflow, ListTodo, Target, Shield, Users2, Search, ChevronRight, Bot, Minimize2, Maximize2, MessageSquare } from 'lucide-react';

type Article = {
  id: string;
  title: string;
  description: string;
  readTime: string;
};

type Category = {
  id: string;
  title: string;
  description: string;
  icon: any;
  articles: Article[];
};

const categories: Category[] = [
  {
    id: '1',
    title: 'Leadership and Team Development',
    description: 'Build strong teams and develop leadership skills',
    icon: Users,
    articles: [
      {
        id: '1-1',
        title: 'Building High-Performance Teams in Public Service',
        description: 'Learn proven strategies for developing and leading effective government teams',
        readTime: '12 min read'
      },
      {
        id: '1-2',
        title: 'Emotional Intelligence in Public Administration',
        description: 'Understanding and applying EQ principles in government leadership',
        readTime: '15 min read'
      },
      {
        id: '1-3',
        title: 'Motivating Public Sector Teams',
        description: 'Techniques for inspiring and engaging government employees',
        readTime: '10 min read'
      }
    ]
  },
  {
    id: '2',
    title: 'Performance Management and Goal Setting',
    description: 'Set and achieve organizational goals effectively',
    icon: Target,
    articles: [
      {
        id: '2-1',
        title: 'SMART Goals in Public Administration',
        description: 'Framework for setting measurable and achievable departmental objectives',
        readTime: '8 min read'
      },
      {
        id: '2-2',
        title: 'KPI Development for Government Services',
        description: 'Creating meaningful performance indicators for public service delivery',
        readTime: '14 min read'
      },
      {
        id: '2-3',
        title: 'Performance Review Best Practices',
        description: 'Conducting effective performance evaluations in government settings',
        readTime: '11 min read'
      }
    ]
  },
  {
    id: '3',
    title: 'Process Optimization and Workflow Management',
    description: 'Streamline workflows and improve efficiency',
    icon: Workflow,
    articles: [
      {
        id: '3-1',
        title: 'Lean Management in Government',
        description: 'Applying lean principles to optimize public service delivery',
        readTime: '13 min read'
      },
      {
        id: '3-2',
        title: 'Digital Transformation of Government Processes',
        description: 'Modernizing workflows through technology adoption',
        readTime: '16 min read'
      },
      {
        id: '3-3',
        title: 'Process Mapping for Public Services',
        description: 'Techniques for analyzing and improving service delivery workflows',
        readTime: '9 min read'
      }
    ]
  },
  {
    id: '4',
    title: 'Task Delegation and Prioritization',
    description: 'Manage workload and delegate effectively',
    icon: ListTodo,
    articles: [
      {
        id: '4-1',
        title: 'Effective Delegation in Public Administration',
        description: 'Strategies for distributing work while maintaining accountability',
        readTime: '10 min read'
      },
      {
        id: '4-2',
        title: 'Time Management for Government Officers',
        description: 'Prioritization techniques for handling multiple responsibilities',
        readTime: '12 min read'
      },
      {
        id: '4-3',
        title: 'Managing Cross-Departmental Projects',
        description: 'Coordinating tasks across different government agencies',
        readTime: '15 min read'
      }
    ]
  },
  {
    id: '5',
    title: 'Risk and Crisis Management',
    description: 'Identify and mitigate organizational risks',
    icon: Shield,
    articles: [
      {
        id: '5-1',
        title: 'Public Sector Risk Assessment Framework',
        description: 'Comprehensive approach to identifying and managing government risks',
        readTime: '14 min read'
      },
      {
        id: '5-2',
        title: 'Crisis Communication in Government',
        description: 'Effective communication strategies during public emergencies',
        readTime: '11 min read'
      },
      {
        id: '5-3',
        title: 'Business Continuity Planning',
        description: 'Ensuring continuous public service delivery during disruptions',
        readTime: '13 min read'
      }
    ]
  },
  {
    id: '6',
    title: 'Citizen Engagement',
    description: 'Improve public service delivery and citizen satisfaction',
    icon: Users2,
    articles: [
      {
        id: '6-1',
        title: 'Digital Citizen Engagement Strategies',
        description: 'Leveraging technology for better citizen interaction',
        readTime: '12 min read'
      },
      {
        id: '6-2',
        title: 'Citizen Feedback Systems',
        description: 'Implementing effective feedback mechanisms for public services',
        readTime: '9 min read'
      },
      {
        id: '6-3',
        title: 'Community Outreach Programs',
        description: 'Building strong relationships with local communities',
        readTime: '11 min read'
      }
    ]
  }
];

function CategoryCard({ category, onClick }: { category: Category; onClick: () => void }) {
  const Icon = category.icon;
  return (
    <div
      onClick={onClick}
      className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Icon className="h-6 w-6 text-indigo-600" />
        </div>
        <h3 className="font-semibold text-gray-900">{category.title}</h3>
      </div>
      <p className="text-gray-600 text-sm mb-4">{category.description}</p>
      <div className="flex items-center text-indigo-600 text-sm font-medium">
        View Resources
        <ChevronRight className="h-4 w-4 ml-1" />
      </div>
    </div>
  );
}

function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <div className="space-y-4">
      {articles.map(article => (
        <div key={article.id} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900 mb-2">{article.title}</h3>
          <p className="text-gray-600 text-sm mb-4">{article.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{article.readTime}</span>
            <button className="text-indigo-600 text-sm font-medium hover:text-indigo-700">
              Read More →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatAssistant() {
  const [message, setMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(true);
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center space-x-2 px-4 py-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <Bot className="h-5 w-5 text-indigo-600" />
          <span className="font-medium text-gray-900">Knowledge Assistant</span>
          <Maximize2 className="h-4 w-4 text-gray-400" />
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow-lg w-full sm:w-96">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-indigo-600" />
              <h3 className="font-medium">Knowledge Assistant</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <Minimize2 className="h-4 w-4 text-gray-400" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded-full">
                <MessageSquare className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
          <div className="h-96 p-4 overflow-y-auto">
            {/* Chat messages would go here */}
          </div>
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about resources..."
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ResourceHub() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = categories.filter(category =>
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-24">
      <div className="text-center px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Resource Hub</h1>
        <p className="mt-2 text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
          Access curated resources and best practices to enhance your management skills
        </p>
      </div>

      <div className="relative max-w-xl mx-auto px-4">
        <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {selectedCategory ? (
        <div className="px-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className="mb-6 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to categories
          </button>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedCategory.title}</h2>
            <p className="mt-2 text-gray-600 text-sm sm:text-base">{selectedCategory.description}</p>
          </div>
          <ArticleList articles={selectedCategory.articles} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-4">
          {filteredCategories.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              onClick={() => setSelectedCategory(category)}
            />
          ))}
        </div>
      )}

      <ChatAssistant />
    </div>
  );
}