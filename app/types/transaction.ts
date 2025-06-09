export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface TransactionRow {
  [key: string]: string | number | Tag[] | undefined;
  tags?: Tag[];
  id?: string;
}

export interface Transaction {
  id: string;
  statementId: string;
  bankId: string;
  accountId: string;
  startRow?: number;
  endRow?: number;
  s3FileUrl?: string;
  fileName?: string;
  createdAt?: string;
  tags?: Tag[];
  [key: string]: string | number | Tag[] | undefined;
} 