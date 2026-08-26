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
};

type Subscriber = () => void;

class JobsStore {
  private jobs: JobType[] = [];
  private subscribers: Set<Subscriber> = new Set();

  getJobs(): JobType[] {
    return [...this.jobs];
  }

  getActiveJobs(): JobType[] {
    return this.jobs.filter(job => job.status === 'active');
  }

  getArchivedJobs(): JobType[] {
    return this.jobs.filter(job => job.status === 'archived');
  }

  getJobById(id: string): JobType | undefined {
    return this.jobs.find(job => job.id === id);
  }

  archiveJob(id: string): void {
    this.updateJob(id, { status: 'archived' });
  }

  unarchiveJob(id: string): void {
    this.updateJob(id, { status: 'active' });
  }

  addJob(job: JobType): void {
    this.jobs = [...this.jobs, job];
    this.notify();
  }

  updateJob(id: string, updates: Partial<JobType>): void {
    this.jobs = this.jobs.map(job =>
      job.id === id ? { ...job, ...updates } : job
    );
    this.notify();
  }

  deleteJob(id: string): void {
    this.jobs = this.jobs.filter(job => job.id !== id);
    this.notify();
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    this.subscribers.forEach(callback => callback());
  }
}

export const jobsStore = new JobsStore();
