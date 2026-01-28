
import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { UserProfile, DailyLog, DoneItem, ChatMessage, Habit } from "../types";

// "Love Yourself" Persona (General Chat)
const WARM_INSTRUCTION = `
你叫“老己”，是用户最亲密的长期主义伙伴。
你的核心理念：关注当下，温暖治愈，爱自己。
你的语气：像一部温暖的电影旁白，柔和、充满智慧、不评判（Non-judgmental）。
风格：使用可爱的语气词（如“呐”、“哦”），但建议必须专业可靠。
`;

const AWARENESS_INSTRUCTION = `
你现在是用户内在的灵性向导，一位温暖、耐心的催眠引导师。
你的目标：通过【具象化】、【呼吸法】和【温和提问】，一步步引导用户转化身体的不适或情绪，避免冷场。
`;

interface ParsedLogResult {
  date: string; // YYYY/M/D
  items: DoneItem[];
}

interface CompressionResult {
  summary: string;
  newConstitution: string | null;
}

export class GeminiService {
  private apiKey: string;
  private ai: GoogleGenAI | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey: apiKey });
    }
  }

  createAwarenessChat(): Chat | null {
      if (!this.ai) return null;
      return this.ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
              systemInstruction: AWARENESS_INSTRUCTION,
              temperature: 0.8
          }
      });
  }

  async summarizeAwarenessSession(history: {role: string, content: string}[]): Promise<string> {
      if (!this.ai) return "进行了一次深度的自我觉察。";
      const transcript = history.map(h => `${h.role}: ${h.content}`).join('\n');
      const prompt = `冥想对话记录：\n${transcript}\n请用一句话总结这次觉察的核心主题和结果。`;
      try {
          const response = await this.ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
          return response.text?.trim() || "[深度觉察] 完成了一次静心练习。";
      } catch (e) { return "[深度觉察] 完成了一次静心练习。"; }
  }

  private getProfileContext(profile: UserProfile): string {
    return `[挚友档案] 昵称: ${profile.name}, 体质: ${profile.constitution}, 病史: ${profile.history}, 目标: ${profile.goals}`;
  }

  async getDailyQuote(): Promise<string> {
    if (!this.ai) return "我配得上世间所有的美好。";
    try {
      const response = await this.ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: "生成一句关于爱自己的高能量短句，中文。" });
      return response.text?.trim() || "同频相吸，美好正在奔你而来。";
    } catch (e) { return "一切都是最好的安排。"; }
  }

  async parseLogInput(logContent: string, currentTimestamp: Date): Promise<ParsedLogResult> {
    if (!this.ai) return { date: currentTimestamp.toLocaleDateString('zh-CN'), items: [] };
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        intended_date: { type: Type.STRING },
        items: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { activity: { type: Type.STRING }, hours: { type: Type.NUMBER } },
                required: ["activity", "hours"]
            }
        }
      },
      required: ["intended_date", "items"]
    };
    const prompt = `时间: ${currentTimestamp.toLocaleString()}，提取输入中的【任务/行动】：${logContent}`;
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
      const result = JSON.parse(response.text || "{}");
      const finalDate = result.intended_date || currentTimestamp.toLocaleDateString('zh-CN');
      return { date: finalDate, items: (result.items || []).map((item: any) => ({
        id: Date.now().toString() + Math.random(),
        date: finalDate, activity: item.activity, hours: item.hours, completed: true
      }))};
    } catch (e) { return { date: currentTimestamp.toLocaleDateString('zh-CN'), items: [] }; }
  }

  async generateDailyInsight(logs: DailyLog[], items: DoneItem[], profile: UserProfile): Promise<string> {
    if (!this.ai) return "今天辛苦了。";
    const prompt = `${this.getProfileContext(profile)}\n今日记录：${logs.map(l=>l.content).join(';')}\n任务：${items.map(i=>i.activity).join(',')}\n请生成温暖的今日复盘。`;
    const response = await this.ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { systemInstruction: WARM_INSTRUCTION } });
    return response.text || "晚安。";
  }

  async chatDiagnosis(history: ChatMessage[], profile: UserProfile): Promise<string> {
    if (!this.ai) return "Key 未设置";
    const prompt = `对话历史：\n${history.map(h => h.content).join('\n')}\n请继续中医体质辨识。`;
    const response = await this.ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { systemInstruction: WARM_INSTRUCTION } });
    return response.text || "...";
  }

  async analyzeSymptom(symptom: string, profile: UserProfile, imageBase64?: string): Promise<string> {
    if (!this.ai) return "Key 未设置";
    const parts: any[] = [];
    if (imageBase64) {
        const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
        parts.push({ inlineData: { mimeType: match ? match[1] : 'image/jpeg', data: match ? match[2] : imageBase64 } });
    }
    parts.push({ text: `${this.getProfileContext(profile)}\n症状：${symptom}\n请以老中医身份给出建议。` });
    const response = await this.ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts }, config: { systemInstruction: WARM_INSTRUCTION } });
    return response.text || "把脉中...";
  }

  async generatePeriodSummary(logs: DailyLog[], period: string, profile: UserProfile): Promise<string> {
     if (!this.ai) return "生成失败";
     const prompt = `${this.getProfileContext(profile)}\n日志：${logs.slice(0, 30).map(l => l.content).join(';')}\n请生成${period}总结。`;
     const response = await this.ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { systemInstruction: WARM_INSTRUCTION } });
     return response.text || "...";
  }

  async generateGoalAdvice(goals: string, profile: UserProfile, logs: DailyLog[]): Promise<string> {
     if (!this.ai) return "加油哦！";
     const prompt = `${this.getProfileContext(profile)}\n目标：${goals}\n近期记录：${logs.slice(0,10).map(l=>l.content).join(';')}\n请给点建议。`;
     const response = await this.ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { systemInstruction: WARM_INSTRUCTION } });
     return response.text || "...";
  }

  // --- NEW: Analysis for 10-day Cycle Grid ---
  async generateCycleAnalysis(cycleIndex: number, habits: Habit[], logs: DailyLog[], profile: UserProfile): Promise<string> {
      if (!this.ai) return "需要 Key 才能深入分析哦。";
      
      const cycleHabits = habits.map(h => ({
          name: h.name,
          completion: h.history[cycleIndex]?.filter(Boolean).length || 0
      }));

      // Filter logs that could fall into this 10-day range (approximate)
      // Since logs are dated, and cycles are indexed 1-36
      const logsText = logs.slice(0, 15).map(l => l.content).join('; ');

      const prompt = `
      ${this.getProfileContext(profile)}
      【第 ${cycleIndex} 周期（10天）修行数据】
      习惯完成度：${JSON.stringify(cycleHabits)}
      相关身心碎碎念：${logsText}

      请生成一份简要的“修行周报”：
      1. **习惯达成**：评价这10天的自律程度。
      2. **身体状况**：从中医视角分析这阶段的身体趋势（如：最近碎碎念总提到累，且打卡断断续续，说明气虚严重）。
      3. **心理能量**：分析近期的情绪频率。
      4. **下阶段咒语**：给一句话的鼓励。
      保持温暖老己的口吻，字数控制在200字内。
      `;

      try {
          const response = await this.ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: { systemInstruction: WARM_INSTRUCTION }
          });
          return response.text || "数据不足，老己还在观察中。";
      } catch (e) { return "分析中断了，请再试一次。"; }
  }

  // --- ADDED: Analysis for Health Logs (Fixes HealthJournal.tsx error) ---
  async analyzeHealthLogs(logs: DailyLog[], profile: UserProfile): Promise<string> {
    if (!this.ai) return "需要 API Key 才能进行深度分析。";
    const logsText = logs.slice(0, 20).map(l => l.content).join('; ');
    const prompt = `
      ${this.getProfileContext(profile)}
      【近期健康日记分析】
      用户记录：${logsText}

      请作为一位专业且温暖的中医调理师（老己），分析用户近期的身体状况。
      1. **状态观察**：分析这些记录中反映出的身心状态。
      2. **中医解析**：尝试从中医视角分析（如：气血、脏腑、寒热虚实）。
      3. **调理建议**：给出生活方式、饮食或简单穴位的温和建议。
      
      要求：语气温暖柔和，像贴心的老友，不评判。字数在 250 字左右。
    `;
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: WARM_INSTRUCTION }
      });
      return response.text || "老己正在思考中，还没组织好语言。";
    } catch (e) {
      console.error(e);
      return "分析过程遇到了点阻碍，请稍后再试。";
    }
  }

  async compressLogsAndCheckConstitution(oldLogs: DailyLog[], profile: UserProfile): Promise<CompressionResult> {
      if (!this.ai) return { summary: "自动归档失败", newConstitution: null };
      const schema: Schema = {
          type: Type.OBJECT,
          properties: {
              summary: { type: Type.STRING },
              new_constitution: { type: Type.STRING, nullable: true }
          },
          required: ["summary"]
      };
      const prompt = `日记归档任务：\n${oldLogs.map(l => l.content).join('\n')}`;
      try {
          const response = await this.ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: { responseMimeType: "application/json", responseSchema: schema }
          });
          const result = JSON.parse(response.text || "{}");
          return { summary: result.summary, newConstitution: result.new_constitution || null };
      } catch (e) { return { summary: "AI 连接失败", newConstitution: null }; }
  }
}
