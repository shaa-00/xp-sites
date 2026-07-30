import { createHash } from 'crypto';

interface BookmarkData {
  title: string;
  url: string;
  isGitHub?: boolean;
}

interface CategorizedLinks {
  [category: string]: BookmarkData[];
}

// Ordered for priority - check specific categories first
const categoryKeywords: Record<string, string[]> = {
  'VPN & Security': ['vpn', 'security', 'privacy', 'encryption', 'proxy', 'anonymity', 'proton', 'tunnelbear', 'hide.me', 'windscribe', 'privado', 'deviceinfo'],
  'Learning': ['course', 'tutorial', 'documentation', 'docs', 'guide', 'learn', 'udemy', 'coursera', 'edx', 'pluralsight', 'hackathon', 'academy'],
  'AI & ML': ['agentic', 'agent', 'langchain', 'langgraph', 'hugging face', 'colab', 'deep agent', 'workflow', 'openai', 'claude code', 'mistral'],
  'Cloud & DevOps': ['google cloud', 'console.cloud', 'aws', 'azure', 'vercel', 'deployment', 'firebase', 'docker', 'kubernetes', 'adb'],
  'Development': ['github', 'git', 'react', 'next.js', 'vue', 'svelte', 'typescript', 'javascript', 'nodejs', 'cursor', 'programming'],
  'Design & UI': ['figma', 'framer', 'animation', 'motion', 'khroma', 'component', 'ux', 'ui kit', 'interface', 'checkout', 'asana', 'portfolio'],
  'Art & Creative': ['pixiv', 'illustration', 'behance', 'dribbble', 'graphic', 'aero', 'archive', 'vfx'],
  'Entertainment': ['anime', 'streaming', 'miruro', 'movie', 'game', 'comic', 'manga', 'video'],
  'Productivity': ['notion', 'slack', 'trello', 'asana', 'calendar', 'email', 'task', 'project', 'read.ai'],
  'Social & Community': ['reddit', 'discord', 'twitter', 'x.com', 'linkedin', 'social', 'community', 'forum'],
  'Tools & Resources': ['icon', 'font', 'color', 'generator', 'editor', 'converter', 'asset', 'library', 'template', 'gallery', 'mockup', 'svg', 'logo'],
};

export function categorizeUrl(title: string, url: string, isGitHub: boolean = false): string {
  const combinedText = `${title} ${url}`.toLowerCase();

  // Check keyword matches in priority order
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => combinedText.includes(keyword))) {
      return category;
    }
  }

  // For GitHub repos, allow creating new category from language
  if (isGitHub) {
    try {
      const urlObj = new URL(url);
      // Extract repo name for potential dynamic category
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      if (pathParts.length >= 2) {
        // Could use language or repo name for categorization
        return 'Tools & Resources';
      }
    } catch {
      // Continue to fallback
    }
  }

  // Fallback: Domain-based detection
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();

    // Specific domain rules
    if (domain.includes('pixiv')) return 'Art & Creative';
    if (domain.includes('github')) return 'Development';
    if (domain.includes('console.cloud')) return 'Cloud & DevOps';
    if (domain.includes('make.com')) return 'Learning'; // Automation/workflow
    if (domain.includes('substack')) return 'Learning';
    if (domain.includes('medium')) return 'Learning';
    if (domain.includes('dev.to')) return 'Learning';
    if (domain.includes('behance') || domain.includes('dribbble')) return 'Art & Creative';
    if (domain.includes('reddit') || domain.includes('discord')) return 'Social & Community';

    // Default fallback - use predefined categories only
    return 'Tools & Resources';
  } catch {
    return 'Tools & Resources';
  }
}

export function categorizeLinks(links: BookmarkData[]): CategorizedLinks {
  const categorized: CategorizedLinks = {};

  links.forEach((link) => {
    const category = categorizeUrl(link.title, link.url, link.isGitHub ?? false);
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push(link);
  });

  // Sort categories and links within each category
  const sorted: CategorizedLinks = {};
  Object.keys(categorized)
    .sort()
    .forEach((category) => {
      sorted[category] = categorized[category].sort((a, b) =>
        a.title.localeCompare(b.title)
      );
    });

  return sorted;
}

export function generateColorForCategory(category: string): string {
  const hash = createHash('md5').update(category).digest('hex');
  const hue = (parseInt(hash.substring(0, 6), 16) % 360);
  return `hsl(${hue}, 70%, 50%)`;
}
