// Project showcase functionality
class ProjectShowcase {
    constructor() {
        this.projects = [];
        this.categories = new Set(['all']);
        this.currentFilter = 'all';
        this.githubUsername = 'vibespin'; // Replace with your GitHub username
        this.githubToken = null; // Add your GitHub personal access token here if repos are private
        this.init();
    }

    async init() {
        await this.loadProjects();
        this.setupCategories();
        this.renderProjects();
        this.setupEventListeners();
    }

    async loadProjects() {
        try {
            // Fetch live data from GitHub API
            const headers = {};
            if (this.githubToken) {
                headers['Authorization'] = `token ${this.githubToken}`;
            }
            
            const response = await fetch(`https://api.github.com/users/${this.githubUsername}/repos?sort=updated&per_page=100`, {
                headers: headers
            });
            const repos = await response.json();
            
            // Filter for breakthrough projects and convert to our format
            console.log('All repos:', repos.map(r => r.name)); // Debug log
            this.projects = repos
                .filter(repo => repo.name.includes('breakthrough'))
                .map(repo => this.convertGitHubRepo(repo))
                .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            
            console.log('Filtered breakthrough projects:', this.projects); // Debug log
            
            // Extract unique categories
            this.projects.forEach(project => {
                this.categories.add(project.category);
            });
        } catch (error) {
            console.error('Failed to load projects from GitHub:', error);
            // Show error message to user
            document.getElementById('projects-grid').innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-gray-500 mb-4">
                        <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p class="text-lg font-medium">unable to load projects from github</p>
                        <p class="text-sm mt-2">check the console for more details</p>
                    </div>
                </div>
            `;
            
            // Fallback to static data
            try {
                const response = await fetch('projects.json');
                this.projects = await response.json();
                console.log('Loaded fallback projects:', this.projects);
                this.projects.forEach(project => {
                    this.categories.add(project.category);
                });
            } catch (fallbackError) {
                console.error('Failed to load fallback projects:', fallbackError);
                this.projects = [];
            }
        }
    }

    convertGitHubRepo(repo) {
        // Extract category from repo name and convert to readable format
        const nameWithoutPrefix = repo.name.replace('breakthrough_', '').replace(/^\d{4}-\d{2}-\d{2}[-_]/, '');
        const category = this.extractCategory(repo.name);
        const title = this.formatTitle(repo.name);
        
        return {
            id: repo.id,
            title: title,
            tagline: repo.description || 'No description available',
            category: category,
            githubUrl: repo.html_url,
            image: `https://opengraph.githubassets.com/1/${repo.full_name}`,
            updated_at: repo.updated_at,
            language: repo.language,
            stars: repo.stargazers_count,
            topics: repo.topics || []
        };
    }

    extractCategory(repoName) {
        // Map exact repo names to categories based on the screenshot
        const categoryMap = {
            'breakthrough_2025-09-02_support_ab_testing': 'Analytics & Testing',
            'breakthrough_2025-08-28_payments_flow': 'E-commerce', 
            'breakthrough_2025-08-29_isometric_imagen': 'AI Generative Media',
            'breakthrough_2025-08-26-user-analytics-v2': 'User Research',
            'breakthrough_2025-08-27-user-analytics': 'User Research',
            'breakthrough_2025-08-25-landing-onboarding-flow': 'User Experience'
        };

        // Check for exact matches first
        if (categoryMap[repoName]) {
            return categoryMap[repoName];
        }

        // Fallback categorization based on common terms
        if (repoName.includes('support') || repoName.includes('ab_testing') || repoName.includes('analytics')) return 'Analytics & Testing';
        if (repoName.includes('payment') || repoName.includes('commerce')) return 'E-commerce';
        if (repoName.includes('user') || repoName.includes('feedback')) return 'User Research';
        if (repoName.includes('ai') || repoName.includes('image') || repoName.includes('gen') || repoName.includes('isometric')) return 'AI Generative Media';
        if (repoName.includes('landing') || repoName.includes('onboarding')) return 'User Experience';
        
        return 'Development';
    }

    formatTitle(repoName) {
        // Clean up repo name for display
        let title = repoName
            .replace('breakthrough_', '')
            .replace(/^\d{4}-\d{2}-\d{2}[-_]/, '') // Remove date prefix
            .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
            
        // Handle specific cases
        title = title
            .replace(/Ab Testing/g, 'A/B Testing')
            .replace(/Ai /g, 'AI ')
            .replace(/Api/g, 'API')
            .replace(/Ui/g, 'UI')
            .replace(/Ux/g, 'UX');
            
        return title;
    }

    async openReadmeModal(repo) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('readme-modal');
        if (!modal) {
            modal = this.createReadmeModal();
            document.body.appendChild(modal);
        }

        // Show modal with loading state
        modal.style.display = 'flex';
        const content = modal.querySelector('.readme-content');
        content.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span class="ml-3">loading readme...</span>
            </div>
        `;

        try {
            // Fetch README from GitHub API
            const response = await fetch(`https://api.github.com/repos/${repo}/readme`, {
                headers: this.githubToken ? { 'Authorization': `token ${this.githubToken}` } : {}
            });
            
            if (!response.ok) {
                throw new Error('README not found');
            }

            const data = await response.json();
            // Properly decode base64 to UTF-8
            const base64Content = data.content.replace(/\s/g, ''); // Remove whitespace
            const binaryString = atob(base64Content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const readmeContent = new TextDecoder('utf-8').decode(bytes);
            
            // Simple markdown to HTML conversion
            const htmlContent = this.convertMarkdownToHTML(readmeContent);
            content.innerHTML = htmlContent;
            
        } catch (error) {
            content.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-gray-500">readme not available</p>
                    <p class="text-sm text-gray-400 mt-2">this repository may not have a readme file</p>
                </div>
            `;
        }
    }

    createReadmeModal() {
        const modal = document.createElement('div');
        modal.id = 'readme-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.style.display = 'none';
        
        modal.innerHTML = `
            <div class="bg-white rounded-xl max-w-4xl max-h-[90vh] w-full flex flex-col">
                <div class="flex items-center justify-between p-6 border-b">
                    <h2 class="text-xl font-semibold">readme</h2>
                    <button class="close-modal text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
                <div class="readme-content flex-1 overflow-auto p-6 prose max-w-none"></div>
            </div>
        `;

        // Add close functionality
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        return modal;
    }

    convertMarkdownToHTML(markdown) {
        // Comprehensive markdown to HTML conversion matching GitHub's rendering
        const lines = markdown.split('\n');
        let html = '';
        let inCodeBlock = false;
        let codeBlockLanguage = '';
        let currentList = null; // 'ul' or 'ol' or null
        let listDepth = 0;
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // Handle code blocks first
            if (line.startsWith('```')) {
                if (!inCodeBlock) {
                    // Starting code block
                    inCodeBlock = true;
                    codeBlockLanguage = line.substring(3).trim();
                    html += `<pre class="bg-gray-900 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto"><code class="language-${codeBlockLanguage}">`;
                } else {
                    // Ending code block
                    inCodeBlock = false;
                    html += '</code></pre>';
                }
                continue;
            }
            
            // Inside code block - just add the line
            if (inCodeBlock) {
                html += this.escapeHtml(line) + '\n';
                continue;
            }
            
            // Close any open lists if we hit a non-list line
            if (!this.isListItem(line) && currentList) {
                html += `</${currentList}>`;
                currentList = null;
                listDepth = 0;
            }
            
            // Empty lines
            if (line.trim() === '') {
                if (currentList) {
                    // Don't close lists on empty lines
                    continue;
                } else {
                    html += '<br>';
                    continue;
                }
            }
            
            // Headers with emoji support
            if (line.startsWith('# ')) {
                html += `<h1 class="text-3xl font-bold mt-8 mb-4">${this.processInlineFormatting(line.substring(2))}</h1>`;
            } else if (line.startsWith('## ')) {
                html += `<h2 class="text-2xl font-semibold mt-6 mb-3">${this.processInlineFormatting(line.substring(3))}</h2>`;
            } else if (line.startsWith('### ')) {
                html += `<h3 class="text-xl font-medium mt-4 mb-2">${this.processInlineFormatting(line.substring(4))}</h3>`;
            } else if (line.startsWith('#### ')) {
                html += `<h4 class="text-lg font-medium mt-3 mb-2">${this.processInlineFormatting(line.substring(5))}</h4>`;
            }
            // Task lists (checkboxes)
            else if (line.match(/^[\s]*- \[[ x]\]/)) {
                const indent = (line.match(/^(\s*)/)[1].length / 2) * 20; // 20px per indent level
                const isChecked = line.includes('[x]') || line.includes('[X]');
                const taskText = line.replace(/^[\s]*- \[[ xX]\]\s*/, '');
                
                if (!currentList || currentList !== 'task-list') {
                    if (currentList) html += `</${currentList}>`;
                    html += '<ul class="task-list my-3">';
                    currentList = 'task-list';
                }
                
                html += `<li class="flex items-start" style="margin-left: ${indent}px;">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} disabled class="mt-1 mr-2 h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                    <span class="${isChecked ? 'line-through text-gray-500' : ''}">${this.processInlineFormatting(taskText)}</span>
                </li>`;
            }
            // Regular unordered lists
            else if (line.match(/^[\s]*[-*+]\s/)) {
                const indent = (line.match(/^(\s*)/)[1].length / 2) * 20;
                const listText = line.replace(/^[\s]*[-*+]\s*/, '');
                
                if (!currentList || currentList !== 'ul') {
                    if (currentList) html += `</${currentList}>`;
                    html += '<ul class="list-disc ml-6 my-3">';
                    currentList = 'ul';
                }
                
                html += `<li style="margin-left: ${indent}px;">${this.processInlineFormatting(listText)}</li>`;
            }
            // Ordered lists
            else if (line.match(/^[\s]*\d+\.\s/)) {
                const indent = (line.match(/^(\s*)/)[1].length / 2) * 20;
                const listText = line.replace(/^[\s]*\d+\.\s*/, '');
                
                if (!currentList || currentList !== 'ol') {
                    if (currentList) html += `</${currentList}>`;
                    html += '<ol class="list-decimal ml-6 my-3">';
                    currentList = 'ol';
                }
                
                html += `<li style="margin-left: ${indent}px;">${this.processInlineFormatting(listText)}</li>`;
            }
            // Regular paragraphs
            else {
                const processedLine = this.processInlineFormatting(line);
                if (processedLine.trim()) {
                    html += `<p class="my-2 leading-relaxed">${processedLine}</p>`;
                }
            }
        }
        
        // Close any remaining open list
        if (currentList) {
            html += `</${currentList}>`;
        }
        
        return html;
    }
    
    isListItem(line) {
        return line.match(/^[\s]*[-*+]\s/) || 
               line.match(/^[\s]*\d+\.\s/) || 
               line.match(/^[\s]*- \[[ xX]\]/);
    }
    
    processInlineFormatting(text) {
        let result = text;
        
        // First handle code (to protect it from other formatting)
        const codeBlocks = [];
        result = result.replace(/`([^`]+)`/g, (match, code) => {
            codeBlocks.push(code);
            return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
        });
        
        // Handle links (to protect them from formatting)
        const links = [];
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            links.push({ text, url });
            return `__LINK_${links.length - 1}__`;
        });
        
        // Bold text - handle both ** and __ (non-greedy)
        result = result.replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>');
        result = result.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
        
        // Italic text - handle both * and _ (but not if adjacent to bold)
        result = result.replace(/(?<!\*|\w)\*([^\*\n]+?)\*(?!\*)/g, '<em>$1</em>');
        result = result.replace(/(?<!_|\w)_([^_\n]+?)_(?!_)/g, '<em>$1</em>');
        
        // Restore links
        result = result.replace(/__LINK_(\d+)__/g, (match, index) => {
            const link = links[parseInt(index)];
            return `<a href="${link.url}" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">${link.text}</a>`;
        });
        
        // Restore code blocks
        result = result.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
            const code = codeBlocks[parseInt(index)];
            return `<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">${this.escapeHtml(code)}</code>`;
        });
        
        return result;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupCategories() {
        const filterButtons = document.getElementById('filter-buttons');
        
        // Clear existing buttons except "All Projects"
        const allButton = filterButtons.querySelector('[data-category="all"]');
        filterButtons.innerHTML = '';
        filterButtons.appendChild(allButton);

        // Add category buttons
        [...this.categories].filter(cat => cat !== 'all').sort().forEach(category => {
            const button = document.createElement('button');
            button.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-all hover:bg-gray-300';
            button.textContent = category.toLowerCase();
            button.dataset.category = category;
            filterButtons.appendChild(button);
        });
    }

    renderProjects() {
        const grid = document.getElementById('projects-grid');
        const filteredProjects = this.currentFilter === 'all' 
            ? this.projects 
            : this.projects.filter(project => project.category === this.currentFilter);

        grid.innerHTML = filteredProjects.map(project => `
            <div class="project-card bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" 
                 data-github="${project.githubUrl}"
                 data-repo="${project.githubUrl.split('/').slice(-2).join('/')}">
                <div class="aspect-w-16 aspect-h-9 mb-4">
                    <img src="${project.image}" 
                         alt="${project.title}" 
                         class="w-full h-48 object-cover rounded-t-xl"
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image'">
                </div>
                <div class="p-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            ${project.category.toLowerCase()}
                        </span>
                        ${project.stars > 0 ? `
                        <div class="flex items-center text-gray-500">
                            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                            </svg>
                            <span class="text-xs">${project.stars}</span>
                        </div>
                        ` : ''}
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">${project.title.toLowerCase()}</h3>
                    <p class="text-gray-600 text-sm leading-relaxed line-clamp-3">${project.tagline}</p>
                    
                    <div class="mt-4">
                        <div class="flex items-center gap-4 mb-3">
                            <button class="github-link flex items-center text-primary hover:text-blue-600 transition-colors" data-url="${project.githubUrl}">
                                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-sm font-medium">view on github</span>
                            </button>
                            <button class="readme-link flex items-center text-gray-600 hover:text-gray-800 transition-colors">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <span class="text-sm font-medium">view readme</span>
                            </button>
                        </div>
                        ${project.language ? `
                        <div class="flex items-center justify-end">
                            <div class="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                            <span class="text-xs text-gray-500">${project.language ? project.language.toLowerCase() : ''}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    ${project.updated_at ? `
                    <div class="mt-3 pt-3 border-t border-gray-100">
                        <span class="text-xs text-gray-400">updated ${this.formatDate(project.updated_at)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Add click event listeners to buttons
        grid.querySelectorAll('.github-link').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const githubUrl = button.dataset.url;
                if (githubUrl) {
                    window.open(githubUrl, '_blank');
                }
            });
        });

        grid.querySelectorAll('.readme-link').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const card = button.closest('.project-card');
                const repo = card.dataset.repo;
                this.openReadmeModal(repo);
            });
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
        return `${Math.ceil(diffDays / 365)} years ago`;
    }

    setupEventListeners() {
        // Category filter buttons
        document.getElementById('filter-buttons').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                // Update button states
                document.querySelectorAll('[data-category]').forEach(btn => {
                    btn.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-all hover:bg-gray-300';
                });
                e.target.className = 'px-4 py-2 bg-primary text-white rounded-full text-sm font-medium transition-all hover:bg-blue-600 active';
                
                // Update filter and re-render
                this.currentFilter = e.target.dataset.category;
                this.renderProjects();
            }
        });
    }
}

// Initialize the showcase when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProjectShowcase();
});