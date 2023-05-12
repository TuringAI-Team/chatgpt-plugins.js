import { Configuration, OpenAIApi } from "openai";
import { OpenAIExt } from "openai-ext";
import { models } from "./types.js";
import { CreateChatCompletionRequest } from "openai";
import axios from "axios";
import { prefix, formatInstructions, sufix } from "./default-instructions.js";
import pluginsLinks from "./plugins.js";
export default class Client {
  plugins: Array<string> = [];
  constructor(
    private apiKey: string,
    plugins: Array<string>,
    public model: models = "gpt-3.5-turbo"
  ) {
    for (let plugin of plugins) {
      if (!plugin.includes("https://")) {
        plugin = this.getPluginUrl(plugin);
      }
      this.plugins.push(plugin);
    }
  }
  async chat(config: CreateChatCompletionRequest, stream: boolean = false) {
    const configuration = new Configuration({
      apiKey: this.apiKey,
    });
    const openai = new OpenAIApi(configuration);
    let messages = [];
    // remove config.messages
    if (config.messages) {
      messages.push({
        content: await this.generateInstructions(this.plugins),
        role: "system",
      });
      messages = config.messages;
      delete config.messages;
    } else {
      throw new Error("config.messages is required");
    }
    if (stream) {
    } else {
      let response = await openai.createChatCompletion({
        ...config,
        messages,
      });
      return response.data;
    }
  }
  async generateInstructions(plugins: Array<string>): Promise<string> {
    let instructions = "";
    let tools = [];
    for (let plugin of plugins) {
      if (!plugin.includes("https://")) {
        plugin = this.getPluginUrl(plugin);
      }
      let pluginInstructions = await this.generatePlugingInstructions(plugin);
      tools.push(pluginInstructions);
    }
    let toolStrings = `\n\n${tools.map(
      (tool) => `${tool.name}: ${tool.description}`
    )}`;
    let toolNames = tools.map((tool) => tool.name).join(", ");
    let formattedInstructions = formatInstructions.replace(
      "{tool_names}",
      toolNames
    );
    instructions = `${prefix}${toolStrings}\n\n${formattedInstructions}\n\n${sufix}`;
    return instructions;
  }
  async generatePlugingInstructions(plugin: string): Promise<any> {
    let response = await axios.get(plugin);
    let data = response.data;
    let description = `Call this tool to get the OpenAPI spec (and usage guide) for interacting with the ${data.name_for_human} API. You should only call this ONCE! What is the ${data.name_for_human} API useful for? ${data.description_for_human}`;
    let apiResponse = await axios.get(data.api.url);
    let apiData = apiResponse.data;
    let apiSpec = `Usage Guide: ${data.description_for_model.replace(
      "\n",
      ""
    )}\n\nOpenAPI Spec: ${JSON.stringify(apiData)}`;
    return { description, apiSpec, plugin: data, name: data.name_for_model };
  }

  getPluginUrl(plugin): string {
    return pluginsLinks[plugin];
  }
}
