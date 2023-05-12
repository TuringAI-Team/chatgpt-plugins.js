import Client from "../dist/index.js";
import "dotenv/config";

(async () => {
  let client = new Client(process.env.OPENAI_API_KEY, ["klarna"]);
  let response = await client.chat({
    messages: [
      {
        role: "user",
        content: "what t shirts are available in klarna?",
      },
    ],
    model: "gpt-3.5-turbo",
    temperature: 0.5,
  });
  console.log(response.choices[0].message);
})();
