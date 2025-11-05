export interface BookOverdueEvent {
  loanId: string;
  bookId: string;
  memberId: string;
  daysPastDue: number;
  markedOverdueAt: string;
}

