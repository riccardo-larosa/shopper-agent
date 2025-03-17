import * as fs from "fs";
import * as yaml from "js-yaml";
import { JsonSpec, JsonObject } from "langchain/tools";
import { createOpenApiAgent, OpenApiToolkit } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { getToken } from "utils/apiTools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
export const testOpenApiTools = async () => {
  let data: JsonObject;
  try {
    const apiSpec = "https://elasticpath.dev/assets/openapispecs/catalog/catalog_view.yaml";
    const yamlFile = await fetch(apiSpec);
    const yamlText = await yamlFile.text();
    data = yaml.load(yamlText) as JsonObject;
    if (!data) {
      throw new Error("Failed to load OpenAPI spec");
    }
  } catch (e) {
    console.error(e);
    return;
  }

  const { access_token: token } = await getToken("implicit");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const model = new ChatOpenAI(
    {
      model: "gpt-4o-mini",
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY,
    }
  );
  const toolkit = new OpenApiToolkit(new JsonSpec(data), model, headers);
  const tools = toolkit.getTools();

  console.log(
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }))
  );
  const agExecutor = createReactAgent({llm: model, tools: tools});

  const input = `find the right get request to show all the hierarchies , the base url is https://useast.api.elasticpath.com`;
  console.log(`Executing with input "${input}"...`); 

  const events = await agExecutor.stream(
    { messages: [["user", input]] },
    { streamMode: "values" }
  );
  for await (const event of events) {
    const lastMsg = event.messages[event.messages.length - 1];
    if (lastMsg.tool_calls?.length) {
      console.dir(lastMsg.tool_calls, { depth: null });
    } else if (lastMsg.content) {
      console.log(lastMsg.content);
    }
  }
};