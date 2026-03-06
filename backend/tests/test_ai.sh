curl --location --request POST 'https://hongmacc.com/api/v1/messages' \
--header 'x-api-key: sk-hongmacc-494bcf8510fa47d4aecc488116e099ed' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "claude-opus-4-6",
    "max_tokens": 4096,
      "stream": true,
      "messages": [
        {
          "role": "user",
          "content": "你好，请介绍一下你自己。"
        }
      ]
}'