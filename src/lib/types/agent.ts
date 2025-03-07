
export interface AgentConfig {
    mongodbUri: string;
    dbName: string;
    collectionName: string;
    openaiApiKey: string;
    indexName?: string;
    topK?: number;
}
