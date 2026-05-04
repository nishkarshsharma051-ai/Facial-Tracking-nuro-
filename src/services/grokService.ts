
export interface GrokAnalysisResult {
  message: string;
  advice: string;
  timestamp: number;
}

class GrokService {
  private apiKey: string = import.meta.env.VITE_GROQ_API_KEY || '';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  hasKey(): boolean {
    return !!this.apiKey;
  }

  async analyzeSnapshot(base64Image: string): Promise<GrokAnalysisResult> {
    if (!this.apiKey) {
      throw new Error('AI API key not set');
    }

    try {
      // Remove the data:image/jpeg;base64, prefix if present
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

      // Using Groq API (OpenAI compatible) since the key is a Groq key
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this webcam image from an Eye Tracking app. The user sees a "No Face Detected" error. Tell them exactly why detection might be failing (lighting, angle, occlusion, etc.) and give one clear fix. Keep it under 40 words.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${cleanBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Groq API request failed');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Simple parsing of AI's response
      return {
        message: content,
        advice: this.extractAdvice(content),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[AiService] Analysis failed:', error);
      throw error;
    }
  }

  private extractAdvice(content: string): string {
    // Basic logic to pick the last sentence or look for keywords
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);
    return sentences[sentences.length - 1]?.trim() + '.' || 'Try adjusting your lighting and position.';
  }
}

export const grokService = new GrokService();
