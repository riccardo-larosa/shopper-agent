import { AgentConfig } from '../types/agent';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoClient } from 'mongodb';

export class MongoDBRetriever {
    private vectorStore!: MongoDBAtlasVectorSearch;

    async init(config: AgentConfig) {
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: config.openaiApiKey,
            modelName: "text-embedding-3-small",
        });
        const client = new MongoClient(config.mongodbUri);
        await client.connect();
        const collection = client.db(config.dbName).collection(config.collectionName);
        this.vectorStore = new MongoDBAtlasVectorSearch(
            embeddings,
            {
                collection: collection,
                indexName: config.indexName || "vector_index",
            }
        );
    }

    async similaritySearch(query: string, topK: number = 5) {
        return await this.vectorStore.similaritySearch(query, topK);
    }
}

export async function findRelevantContent(question: string) {
    console.log(`calling findRelevantContent with question: ${question}`);
    const config = {
        mongodbUri: process.env.MONGODB_CONNECTION_URI!,
        dbName: process.env.MONGODB_DATABASE_NAME!,
        collectionName: process.env.MONGODB_COLLECTION_NAME!,
        openaiApiKey: process.env.OPENAI_API_KEY!,
        topK: 5,
        indexName: "vector_index",
    };

    const agent = new MongoDBRetriever();
    try {
        await agent.init(config);

        // Get relevant documents
        const results = await agent.similaritySearch(question);
        
        const docs = results.map(doc => doc.metadata.source).join('\n');
        console.log(`Content sources: -----------------------\n ${docs}`);
        return results;
    } catch (error) {
        console.error('Error during MongoDB retrieval:', error);
        throw error; // or handle the error as needed
    }

}

export async function findTechnicalContent(question: string) {
    console.log(`calling findTechnicalContent with question: ${question}`);
    const config = {
        mongodbUri: process.env.MONGODB_CONNECTION_URI!,
        dbName: process.env.MONGODB_DATABASE_NAME!,
        collectionName: process.env.MONGODB_API_COLLECTION_NAME!,
        openaiApiKey: process.env.OPENAI_API_KEY!,
    };
    
    const apiAgent = new MongoDBRetriever();
    try {
        await apiAgent.init(config);
        const results = await apiAgent.similaritySearch(question);
        const docs = results.map(doc => doc.metadata.source).join('\n');
        console.log(`APIsources: -----------------------\n ${docs}`);
        return results;
    } catch (error) {
        console.error('Error during MongoDB retrieval:', error);
        throw error; // or handle the error as needed
    }
}
