import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { UserProfile, DailyLog, DoneItem, ChatMessage } from "../types";

// "Love Yourself" Persona (General Chat)
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

// NEW: Awareness Persona (Immersive Guided Meditation)
const AWARENESS_INSTRUCTION = `
你现在是用户内在的灵性向导，一位温暖、耐心的催眠引导师。
你的目标：通过【具象化】、【呼吸法】和【温和提问】，一步步引导用户转化身体的不适或情绪，避免冷场。

【交互风格 - 极为重要】：
1. **拒绝指令，改为邀请**：不要生硬地说“去观察它”，要说“能不能试着把温柔的呼吸带到那个地方？”
2. **拒绝抽象，改为具象**：不要只谈“感受”，要引导用户描述“颜色”、“形状”、“温度”、“质地”。
3. **拒绝冷场（关键）**：每次回复的**最后一句**，必须是一个【微小的具体动作引导】或【温柔的感受询问】，明确告诉用户下一步做什么。

【引导流程 - 请严格判断当前处于哪个阶段】：

阶段一：定锚 (Anchor) —— 当用户刚提出不适（如“胸口闷”、“头痛”）
- 核心动作：确认位置，引导呼吸，建立连接。
- 话术示例：“收到。闭上眼睛，把手轻轻放在那个不舒服的地方。深深吸气... 告诉我，那个感觉主要集中在哪里？是正中间，还是偏向某一边？”

阶段二：具象 (Visualize) —— 当用户确认位置后
- 核心动作：引导描述形状、颜色、质地。让感受“物体化”。
- 话术示例：“很好。现在，发挥一点想象力。如果这个紧绷感有形状，它看起来像什么？是一块坚硬的灰色石头，还是一团红色的火？它是冷的还是热的？”

阶段三：软化 (Soften) —— 当用户描述了形状后
- 核心动作：用光、水、呼吸去包裹和消融它。
- 话术示例：“看到了。现在，想象你的呼吸是一股金色的暖流。吸气时，暖流包围住那块‘石头’；呼气时，试着让气息渗透进去... 感觉它的边缘是不是开始慢慢融化、变软了一点点？”

阶段四：抽离 (Detach) —— 当感觉发生变化后
- 核心动作：引导用户成为“观察者”，看着那个物体离开或消散。
- 话术示例：“对，就这样。看着那团雾气慢慢散开，飘向头顶上方。你只是天空，看着这片云飘过。此刻，那个位置的感觉变得轻盈一点了吗？”

阶段五：结束 (Close) —— 当用户感到平静
- 核心动作：慢慢回到现实，给予祝福。
- 话术示例：“太棒了。保持这份轻盈，慢慢睁开眼睛。记住，你随时可以这样用呼吸安抚自己。准备好回到当下的生活了吗？”

【注意】：每次只回复一段话，引导一个步骤。不要一次性说完所有步骤。节奏要慢，像在哄睡。
`;

interface ParsedLogResult {
  date: string; // YYYY/M/D
  items: DoneItem[];
}

interface CompressionResult {
  summary: string;
  newConstitution: string | null;
}

interface MindfulnessResult {
  guidance: string;
  affirmation: string;
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

  // --- NEW: Create Awareness Chat Session ---
  createAwarenessChat(): Chat | null {
      if (!this.ai) return null;
      return this.ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
              systemInstruction: AWARENESS_INSTRUCTION,
              temperature: 0.8 // Increased for more creative visualization metaphors
          }
      });
  }

  // --- NEW: Summarize Awareness Session ---
  async summarizeAwarenessSession(history: {role: string, content: string}[]): Promise<string> {
      if (!this.ai) return "进行了一次深度的自我觉察。";
      
      const transcript = history.map(h => `${h.role}: ${h.content}`).join('\n');
      const prompt = `
      这是一段用户进行的“当下觉察”冥想对话：
      ${transcript}

      请用一句话总结这次觉察的核心主题和结果，格式如：“[深度觉察] 因工作压力感到胸闷，通过具象化呼吸法，将‘灰色石头’消融，回归了平静。”
      `;

      try {
          const response = await this.ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt
          });
          return response.text?.trim() || "[深度觉察] 完成了一次静心练习。";
      } catch (e) {
          return "[深度觉察] 完成了一次静心练习。";
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

  // 2. Mindfulness Response (Spiritual Guide) - Keeping for legacy or quick prompts
  async mindfulnessResponse(feeling: string): Promise<MindfulnessResult> {
    if (!this.ai) throw new Error("API Key not set");

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        guidance: { type: Type.STRING, description: "A warm, spiritual guidance paragraph (approx 50-80 words)." },
        affirmation: { type: Type.STRING, description: "A short, powerful affirmation mantra (max 20 words)." }
      },
      required: ["guidance", "affirmation"]
    };

    const prompt = `
    System Persona: 你是一位深谙《当下的力量》、《与神对话》、吸引力法则的灵性导师。你不是医生，不关注身体症状，只关注能量和觉知。
    
    用户输入 (User Feeling): “${feeling}”
    
    任务：
    1. **Guidance (指引)**: 
       - 不要说普通的安慰废话。
       - 使用“臣服”与“观察者”视角。引导用户去“看”那个念头，而不是“成为”那个念头。
       - 告诉用户情绪只是流经的能量。
       - 语气温柔、高维、充满爱。
    
    2. **Affirmation (能量咒语)**:
       - 生成一句基于吸引力法则的简短肯定语。
       - 例如：“这一刻是完美的，我所需的一切都在我之内。”
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
          guidance: result.guidance || "深呼吸，回到当下。",
          affirmation: result.affirmation || "我就是爱本身。"
      };
    } catch (e) {
      return {
          guidance: "此刻，允许一切发生。你的内在是宁静的。",
          affirmation: "我接受当下的自己。"
      };
    }
  }

  // 3. Smart Log Parsing (Strict Classifier: Task vs Health/Mood)
  async parseLogInput(logContent: string, currentTimestamp: Date): Promise<ParsedLogResult> {
    if (!this.ai) return { date: currentTimestamp.toLocaleDateString('zh-CN'), items: [] };
    
    // Schema for structured output
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        intended_date: { 
            type: Type.STRING, 
            description: "YYYY/M/D format. Default to current date unless user implies 'yesterday'/'last night' during early morning hours." 
        },
        items: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                activity: { type: Type.STRING, description: "Short activity name" },
                hours: { type: Type.NUMBER, description: "Time spent in hours" },
                },
                required: ["activity", "hours"]
            }
        }
      },
      required: ["intended_date", "items"]
    };

    const timeStr = currentTimestamp.toLocaleString('zh-CN', { hour12: false });
    
    const prompt = `
    当前时间: ${timeStr}
    用户输入: “${logContent}”

    你是一个严格的数据分类助手。
    
    【核心规则 - 必须遵守】：
    1. **分类提取 (items)**: 
       - 仅提取属于 **【Task】(明确的行动、工作、学习、运动)** 的内容存入 items。
       - **绝对不要**提取 【Health】(饮食、睡眠、身体感受) 或 【Mood】(情绪、焦虑、开心) 类内容。
       - 例如：
         - "吃了火锅" -> 不是 Task，items 为空。
         - "焦虑得睡不着" -> 不是 Task，items 为空。
         - "看书1小时" -> 是 Task，提取 {"activity": "看书", "hours": 1}。
         - "跑步30分钟，心情很好" -> 提取 {"activity": "跑步", "hours": 0.5}，忽略心情。
    
    2. **日期推断 (intended_date)**:
       - 保持原有的日期推断逻辑（凌晨谈昨晚算昨天）。
       - 格式: YYYY/M/D
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
      
      const finalDate = result.intended_date || currentTimestamp.toLocaleDateString('zh-CN');
      
      const items = (result.items || []).map((item: any) => ({
        id: Date.now().toString() + Math.random(),
        date: finalDate, 
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

  // 10. Compress Logs & Check Constitution Change
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