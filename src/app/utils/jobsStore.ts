// Centralized jobs store for Job Board management
export type JobType = {
  id: string;
  title: string;
  description: string;
  type: string;
  duration: string;
  status: 'active' | 'closed' | 'archived';
  postedDate?: string;
  location?: string;
  requirements?: string[];
  responsibilities?: string[];
  department?: string;
  posted?: string;
};

type Subscriber = () => void;

class JobsStore {
  private jobs: JobType[] = [];
  private subscribers: Set<Subscriber> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  // Initialize from localStorage on first access
  private loadFromLocalStorage(): void {
    if (this.initialized) return;

    try {
      const JOBS_VERSION = '1.0'; // Increment this to force jobs reset
      const storedVersion = localStorage.getItem('jobsStoreVersion');
      const stored = localStorage.getItem('jobsStore');

      // Reset jobs if version changed or no stored data
      if (!stored || storedVersion !== JOBS_VERSION) {
        this.jobs = this.getDefaultJobs();
        localStorage.setItem('jobsStoreVersion', JOBS_VERSION);
        this.saveToLocalStorage();
      } else {
        const parsed = JSON.parse(stored);
        this.jobs = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Failed to load jobs from localStorage:', error);
      this.jobs = this.getDefaultJobs();
    }

    this.initialized = true;
  }

  // Save to localStorage
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('jobsStore', JSON.stringify(this.jobs));
    } catch (error) {
      console.error('Failed to save jobs to localStorage:', error);
    }
  }

  // Default job listings shown on first load
  private getDefaultJobs(): JobType[] {
    return [
      {
        id: 'JOB-001',
        title: 'Part-Time Print Shop Assistant',
        description:
          'Assist customers with print requests, handle document processing, operate printing and binding equipment, and help maintain the print shop. Ideal for students looking to gain hands-on experience in a fast-paced environment.',
        type: 'Part-Time',
        duration: '15-20 hours/week',
        status: 'active',
        department: 'General',
        posted: '2 days ago',
        postedDate: '2026-08-26',
      },
      {
        id: 'JOB-002',
        title: 'Document Encoding / Layout Assistant',
        description:
          'Handle document formatting, encoding, and layout design for customer print jobs. Requires attention to detail and basic familiarity with office/document software.',
        type: 'Part-Time',
        duration: '10-15 hours/week',
        status: 'active',
        department: 'General',
        posted: '5 days ago',
        postedDate: '2026-08-23',
      },
      {
        id: 'JOB-003',
        title: 'Customer Service Representative (Walk-in)',
        description:
          'Greet and assist walk-in customers, receive print requests, verify orders, and process payments. Strong communication and customer service skills are a plus.',
        type: 'Contract',
        duration: 'Full-time (8 hours/day)',
        status: 'active',
        department: 'General',
        posted: '1 week ago',
        postedDate: '2026-08-21',
      },
    ];
  }

  getJobs(): JobType[] {
    this.loadFromLocalStorage();
    return [...this.jobs];
  }

  getActiveJobs(): JobType[] {
    this.loadFromLocalStorage();
    return this.jobs.filter(job => job.status === 'active');
  }

  getArchivedJobs(): JobType[] {
    this.loadFromLocalStorage();
    return this.jobs.filter(job => job.status === 'archived');
  }

  getJobById(id: string): JobType | undefined {
    this.loadFromLocalStorage();
    return this.jobs.find(job => job.id === id);
  }

  archiveJob(id: string): void {
    this.updateJob(id, { status: 'archived' });
  }

  unarchiveJob(id: string): void {
    this.updateJob(id, { status: 'active' });
  }

  addJob(job: JobType): void {
    this.loadFromLocalStorage();
    this.jobs = [...this.jobs, job];
    this.saveToLocalStorage();
    this.notify();
  }

  updateJob(id: string, updates: Partial<JobType>): void {
    this.loadFromLocalStorage();
    this.jobs = this.jobs.map(job =>
      job.id === id ? { ...job, ...updates } : job
    );
    this.saveToLocalStorage();
    this.notify();
  }

  deleteJob(id: string): void {
    this.loadFromLocalStorage();
    this.jobs = this.jobs.filter(job => job.id !== id);
    this.saveToLocalStorage();
    this.notify();
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => { this.subscribers.delete(callback); };
  }

  private notify(): void {
    this.subscribers.forEach(callback => callback());
  }
}

export const jobsStore = new JobsStore();
