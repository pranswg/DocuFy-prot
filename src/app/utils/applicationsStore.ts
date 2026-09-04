export type ApplicationType = {
  id: string;
  jobId: string;
  jobTitle: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  contact: string;
  position: string;
  skills: string;
  portfolio: string;
  portfolioType?: 'link' | 'file';
  portfolioFile?: File | null;
  portfolioFileName?: string;
  appliedDateTime: string;
  status: 'Pending' | 'Under Review' | 'For Interview' | 'Approved' | 'Rejected';
  appliedDate: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  rejectionReason?: string;
};

type Subscriber = () => void;

class ApplicationsStore {
  private applications: ApplicationType[] = [];
  private subscribers: Set<Subscriber> = new Set();

  getApplications(): ApplicationType[] {
    return [...this.applications];
  }

  getApplicationById(id: string): ApplicationType | undefined {
    return this.applications.find((a) => a.id === id);
  }

  getApplicationByJobId(jobId: string): ApplicationType | undefined {
    return this.applications.find((a) => a.jobId === jobId);
  }

  addApplication(app: Omit<ApplicationType, 'id' | 'status' | 'appliedDate' | 'appliedDateTime'>): ApplicationType {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const newApp: ApplicationType = {
      ...app,
      id: `APP-${String(this.applications.length + 1).padStart(3, '0')}`,
      status: 'Pending',
      appliedDate: dateStr,
      appliedDateTime: `${dateStr} ${timeStr}`,
    };
    this.applications = [...this.applications, newApp];
    this.notify();
    return newApp;
  }

  updateStatus(id: string, status: ApplicationType['status']): void {
    this.applications = this.applications.map((a) =>
      a.id === id ? { ...a, status } : a
    );
    this.notify();
  }

  updateApplication(id: string, updates: Partial<ApplicationType>): void {
    this.applications = this.applications.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    );
    this.notify();
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => { this.subscribers.delete(fn); };
  }

  private notify(): void {
    this.subscribers.forEach((fn) => fn());
  }
}

export const applicationsStore = new ApplicationsStore();
