import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, DailyLog, DoneItem, ChatMessage } from "../types";

// "Love Yourself" Persona
const WARM_INSTRUCTION = `
你叫“老己”，是用户最亲密的长期主义伙伴。
你的核心理念：关注当下，温暖治愈，爱自己。
你的语气：像一部温暖的电影旁白，柔和、充满智慧、不评判（Non-judgmental）。
风格：使用可爱的语气词（如“呐”、“哦”），但建议必须专业可靠。

你的知识库（权威来源）：
1. **中医典籍**：以《黄帝内经》、《伤寒杂病论》、《本草纲目》为核心理论支撑。在分析健康问题时，请运用阴阳五行、脏腑经络、八纲辨证（阴阳表里寒热虚实）等专业逻辑。
2. **现代心理学**：结合《当下的力量》、《原子习惯》、CBT（认知行为疗法）。

在互动中：
1. **老友口吻**：不要用冷冰冰的医生口吻，要像一位深谙医理的老友。
2. **正向引导**：即使指出健康问题，也要用鼓励的方式，强调“身体在向你求救，我们要好好爱它”。
3. **活在当下**：永远引导用户回到当下的感受。
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

  private getProfileContext(profile: UserProfile): string {
    return `
    [挚友档案]
    昵称: ${profile.name || '亲爱的'}
    体质: ${profile.constitution || '探索中'}
    病史/症状: ${profile.history || '无'}
    长期目标: ${profile.goals || '未设置'}
    ---------------------------------------------------
    `;
  }

  // 1. Daily Quote (Energy Card)
  async getDailyQuote(): Promise<string> {
    if (!this.ai) return "我配得上世间所有的美好。";
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "请生成一句关于“吸引力法则”、“爱自己”或“高能量”的短句。语气要温暖、坚定、确信，让用户感受到被宇宙宠爱。例如：“我本具足，无需外求”、“宇宙正在回应我的频率”。中文，不要解释。",
      });
      return response.text?.trim() || "同频相吸，美好正在奔你而来。";
    } catch (e) {
      return "相信相信的力量，一切都是最好的安排。";
    }
  }

  // 2. Mindfulness Response (How do you feel?)
  async mindfulnessResponse(feeling: string): Promise<string> {
    if (!this.ai) throw new Error("API Key not set");
    const prompt = `用户此刻说：“${feeling}”。
    请基于《当下的力量》，用极简、治愈的语言，引导用户接纳这个情绪，深呼吸，回到当下。不要给解决方案，只要陪伴和看见。`;
    
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction: WARM_INSTRUCTION }
    });
    return response.text || "我听到了，深呼吸，我在。";
  }

  // 3. Smart Log Parsing (Date Inference + Item Extraction)
  async parseLogInput(logContent: string, currentTimestamp: Date): Promise<ParsedLogResult> {
    if (!this.ai) return { date: currentTimestamp.toLocaleDateString('zh-CN'), items: [] };
    
    // Schema for structured output
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        intended_date: { 
            type: Type.STRING, 
            description: "The intended date of the event in YYYY/M/D format (e.g., 2024/5/20). Logic: If current time is early morning (00:00-05:00) and user says 'tonight', 'last night' or implies yesterday's evening activities, use the PREVIOUS DAY's date." 
        },
        items: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                activity: { type: Type.STRING, description: "Short activity name" },
                hours: { type: Type.NUMBER, description: "Time spent in hours (estimate if not provided)" },
                },
                required: ["activity", "hours"]
            }
        }
      },
      required: ["intended_date", "items"]
    };

    const timeStr = currentTimestamp.toLocaleString('zh-CN', { hour12: false });
    
    const prompt = `
    当前参考时间 (Current Time): ${timeStr}
    用户输入日志 (User Input): “${logContent}”

    任务：
    1. **判断归属日期 (intended_date)**: 
       - 如果当前是凌晨 (00:00 - 05:00)，且用户提到 "昨晚" (last night)、"今晚" (tonight)、"昨天" (yesterday) 或描述晚间活动（如睡觉、吃夜宵），通常是指**前一天**。
       - 例如：当前是 2024/10/25 01:00。用户说 "今晚吃了火锅"，日期应归为 2024/10/24。
       - 如果用户明确指定日期，以用户为准。
       - 否则默认为当前参考日期的日期。
       - 格式必须为 YYYY/M/D (与 new Date().toLocaleDateString('zh-CN') 格式一致，例如 2024/1/1)。

    2. **提取事项 (items)**: 
       - 提取出具体的可量化事项和耗时。
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      
      const result = JSON.parse(response.text || "{}");
      
      // Default fallback
      const finalDate = result.intended_date || currentTimestamp.toLocaleDateString('zh-CN');
      
      const items = (result.items || []).map((item: any) => ({
        id: Date.now().toString() + Math.random(),
        date: finalDate, // Use the inferred date for items too
        activity: item.activity,
        hours: item.hours,
        completed: true
      }));

      return { date: finalDate, items };

    } catch (e) {
      console.error("Parse Log Error", e);
      return { date: currentTimestamp.toLocaleDateString('zh-CN'), items: [] };
    }
  }

  // 4. Daily Warm Insight
  async generateDailyInsight(logs: DailyLog[], items: DoneItem[], profile: UserProfile): Promise<string> {
    if (!this.ai) throw new Error("API Key not set");

    const profileContext = this.getProfileContext(profile);
    const daySummary = logs.map(l => l.content).join('\n');
    const itemsSummary = items.map(i => `${i.activity} (${i.hours}h)`).join(', ');

    const prompt = `
    ${profileContext}
    今日记录：${daySummary}
    完成事项：${itemsSummary}

    请生成一段温暖的【今日复盘】。
    1. 肯定用户的付出。
    2. 结合中医/身体视角（引用黄帝内经子午流注等理论），温柔地指出需要注意的地方（如：睡得太晚了伤肝胆，吃得太油腻生痰湿）。
    3. 给出一个明天的节气养生小建议。
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: WARM_INSTRUCTION }
      });
      return response.text || "今天辛苦了，晚安。";
    } catch (e) {
      return "连接中断，但爱一直在。";
    }
  }

  // 5. Interactive Diagnosis
  async chatDiagnosis(history: ChatMessage[], profile: UserProfile): Promise<string> {
    if (!this.ai) throw new Error("API Key not set");
    
    const historyText = history.map(h => `${h.role === 'user' ? '用户' : '老中医'}: ${h.content}`).join('\n');
    
    const prompt = `
    你正在进行一场深度的中医体质辨识。
    当前对话历史：
    ${historyText}

    任务：
    1. 依据《中医体质分类与判定》标准，如果信息不足，请继续追问（一次只问一个核心问题）。
    2. 如果信息足够，请直接给出【体质诊断结论】和【调理建议】。
    `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction: WARM_INSTRUCTION }
    });
    
    return response.text || "请继续告诉我您的感受...";
  }

  // 6. Symptom Analysis
  async analyzeSymptom(symptom: string, profile: UserProfile, imageBase64?: string): Promise<string> {
    if (!this.ai) throw new Error("API Key not set");

    const parts: any[] = [];
    if (imageBase64) {
        const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
        const mimeType = match ? match[1] : 'image/jpeg';
        const data = match ? match[2] : imageBase64;
        parts.push({ inlineData: { mimeType, data } });
    }
    const profileContext = this.getProfileContext(profile);
    const textPrompt = `
    ${profileContext}
    用户症状描述：${symptom}
    
    请扮演一位专业老中医（参考伤寒论、金匮要略思路）。
    1. 如果有上传图片（通常是舌象），请详细分析舌质、舌苔。
    2. 结合症状和体质，给出中医辨证分析。
    3. 提供温和的调理建议。
    `;
    parts.push({ text: textPrompt });

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: { systemInstruction: WARM_INSTRUCTION }
      });
      return response.text || "正在把脉中...";
    } catch (e) {
      console.error(e);
      return "老中医此刻繁忙，请稍后再试。";
    }
  }

  // 7. Analyze Health Logs
  async analyzeHealthLogs(logs: DailyLog[], profile: UserProfile): Promise<string> {
    if (!this.ai) throw new Error("API Key not set");
    
    const logContent = logs.map(l => `[${l.date}] ${l.content}`).join('\n');
    const prompt = `
    ${this.getProfileContext(profile)}
    历史健康日志：
    ${logContent}

    请进行深度分析，找出用户潜在的健康问题模式或情绪周期，并给出建议。
    `;

    try {
        const response = await this.ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { systemInstruction: WARM_INSTRUCTION }
        });
        return response.text || "分析中...";
    } catch (e) {
        console.error(e);
        return "分析失败。";
    }
  }

  // 8. Generate Period Summary
  async generatePeriodSummary(logs: DailyLog[], period: 'WEEKLY' | 'MONTHLY', profile: UserProfile): Promise<string> {
     if (!this.ai) throw new Error("API Key not set");

     const logContent = logs.slice(0, 50).map(l => `[${l.date}] ${l.content}`).join('\n'); 
     const prompt = `
     ${this.getProfileContext(profile)}
     
     用户最近的“身心日记”记录：
     ${logContent}
     
     任务：
     请生成一份【${period === 'WEEKLY' ? '周' : '月'}度身心成长报告】。
     `;

     try {
         const response = await this.ai.models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: prompt,
             config: { systemInstruction: WARM_INSTRUCTION }
         });
         return response.text || "生成总结中...";
     } catch (e) {
         console.error(e);
         return "总结生成失败。";
     }
  }

  // 9. Goal Advice Generator
  async generateGoalAdvice(goals: string, profile: UserProfile, logs: DailyLog[]): Promise<string> {
     if (!this.ai) throw new Error("API Key not set");
     const recentLogs = logs.slice(0, 20).map(l => l.content).join('; ');

     const prompt = `
     ${this.getProfileContext(profile)}
     用户的长期目标：${goals}
     近期状态参考：${recentLogs}
     任务：作为“老己”，为目标提供建议。
     `;

     try {
         const response = await this.ai.models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: prompt,
             config: { systemInstruction: WARM_INSTRUCTION }
         });
         return response.text || "加油哦！";
     } catch (e) {
         return "连接断开啦，稍后再试。";
     }
  }

  // 10. NEW: Compress Logs & Check Constitution Change (Dynamic Overwrite)
  async compressLogsAndCheckConstitution(oldLogs: DailyLog[], profile: UserProfile): Promise<CompressionResult> {
      if (!this.ai) return { summary: "自动归档失败", newConstitution: null };

      const logsText = oldLogs.map(l => `[${l.date}]: ${l.content}`).join('\n');
      const currentConst = profile.constitution || "未知";

      const schema: Schema = {
          type: Type.OBJECT,
          properties: {
              summary: { type: Type.STRING, description: "Highly condensed summary of the week's health and emotion." },
              new_constitution: { type: Type.STRING, description: "If the user's constitution has changed based on these logs, return the new constitution name (e.g. '平和质'). If no change or unsure, return NULL.", nullable: true }
          },
          required: ["summary"]
      };

      const prompt = `
      用户当前体质：${currentConst}
      这是一周的日记记录：
      ${logsText}

      任务：
      1. 生成【周结报】：将这些琐碎记录压缩成一段简练的健康与情绪总结（约100字），去掉无关废话，保留症状和情绪波动。
      2. 监测体质变化：如果根据这周记录，发现用户体质有明显转变（例如从“痰湿”变“平和”，或出现了明显的“阴虚”症状），请指出新的体质。如果没变化，new_constitution 设为 null。
      `;

      try {
          const response = await this.ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: schema
              }
          });
          const result = JSON.parse(response.text || "{}");
          return {
              summary: result.summary || "周报生成完毕。",
              newConstitution: result.new_constitution || null
          };
      } catch (e) {
          console.error(e);
          return { summary: "归档时AI连接失败，保留原始记录。", newConstitution: null };
      }
  }
}