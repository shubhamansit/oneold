export interface JobData {
  Branch: string;
  Town: string;
  Zone: string;
  Ward: string;
  "Job Name": string;
  "Job Type": string;
  "Total Jobs": number;
  Completed: number;
  "Completed With Issue": number;
  Failed: number;
  Penalty: number;
  "Assigned Helpers": string;
  Incidents: number;
  more_details: MoreDetails[];
}

export interface MoreDetails {
  Status: string;
  Date: string;
  Vehicle: string;
  "Start Time": string;
  "End Time": string;
  "Actual Start Time": string;
  "Actual End Time": string;
  "Planned Checkpoints": number;
  "On-Time": number;
  Early: number;
  Delay: number;
  "Total Visited Checkpoints": number;
  "Missed Checkpoints": number;
  "Checkpoints Complete Status(%)": number;
  "Estimated Distance": number;
  Distance: number;
  "Distance Completed %": number;
  "On Route": number;
  "On Route %": number;
  "Off Route": number;
  "Off Route %": number;
  "Early Arrival Condition(Minute)": string;
  "Delay Arrival Condition(Minute)": string;
  "Group Name": string;
  Penalty: number;
  Reason: string;
  Remark: string;
  Assigned: string;
  Present: string;
  "Waste Weight": number;
  Incidents: number;
}
