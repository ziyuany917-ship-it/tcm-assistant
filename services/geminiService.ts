
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

// Specialized Instruction for TCM Constitution Diagnosis
const DIAGNOSIS_INSTRUCTION = `
角色：严谨的中医诊断专家。
任务：进行“中医体质辨识”。
参考标准：《中医体质分类与判定》 (平和质, 气虚质, 阳虚质, 阴虚质, 痰湿质, 湿热质, 血瘀质, 气郁质, 特禀质)。

规则：
1. **定向追问**：每次只问 1 个核心问题（最多 2 个）。问题要具体（如：“您平时容易感冒吗？”“舌苔颜色偏白还是偏黄？”）。
2. **动态调整**：根据用户的回答调整下一个问题。
3. **严禁建议**：诊断过程中及最终结果中，**不要**提供饮食、运动或药物建议。只输出诊断结果。
4. **结束判断**：当收集到足够信息（通常 5-8 轮）后，输出最终结论。

输出格式（确诊时）：
请在最后一条回复中包含两部分：
1. 对用户的自然语言回复：“经过分析，您的体质倾向为：[体质名称]。”
2. **JSON指令**（必须放在 Markdown 代码块中）：
\`\`\`json
{ "UPDATE_PROFILE": { "constitution": "体质名称" } }
\`\`\`
`;

interface ParsedLogResult {
  date: string; // YYYY/M/D
  items: DoneItem[];
  riskWarning: string | null;
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

  async parseLogInput(logContent: string, currentTimestamp: Date, profile: UserProfile): Promise<ParsedLogResult> {
    if (!this.ai) return { date: currentTimestamp.toLocaleDateString('zh-CN'), items: [], riskWarning: null };
    
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
        },
        risk_warning: { type: Type.STRING, nullable: true, description: "Health warning prompt if behavior conflicts with constitution" }
      },
      required: ["intended_date", "items"]
    };

    const constitution = profile.constitution || "未知";
    
    // UPDATED PROMPT: Auto-estimate duration (default 0.5h) and stricter Body/Task separation
    const prompt = `
    当前时间: ${currentTimestamp.toLocaleString()}
    用户体质: ${constitution}
    用户输入: "${logContent}"

    任务1 (Strict Intent Classification - 严格意图分类):
    提取输入中的【明确成就/任务】(Task)。
    规则：
    1. 【Task】：仅提取明确的工作、学习、运动任务（如：写代码、跑步、读书、开会、面试、练习）。存入 items。
    2. 【时间估算】：
       - 如果用户明确说了时长（如“面试1小时”），按实际提取。
       - **重要：如果用户未明确说明时长（例如只说了“面试”、“开会”），必须默认设置为 0.5 小时。**
       - **绝对不要返回 0 或 null**。
    3. 【Body/Mood】：饮食、排泄、睡眠、身体感受、情绪、生病等生理活动，【绝不】存入 items。
    4. 【日期】：除非用户明确说了“昨天”、“明天”，否则 intended_date 必须是当前日期 (${currentTimestamp.toLocaleDateString('zh-CN')})。
    
    Few-shot 示例:
    - 输入：“写了2小时代码” -> items: [{activity: "写代码", hours: 2}]
    - 输入：“吃了火锅” -> items: [] (Body -> 不存)
    - 输入：“面试了字节跳动” -> items: [{activity: "面试字节跳动", hours: 0.5}] (触发默认规则：0.5)
    - 输入：“开会” -> items: [{activity: "开会", hours: 0.5}] (触发默认规则：0.5)
    - 输入：“去健身房练腿” -> items: [{activity: "健身房练腿", hours: 1}] (常识估算)
    - 输入：“好累啊，睡了一觉” -> items: [] (睡眠不计入成就)
    
    任务2 (Health Risk Warning - 饮食/行为风险预警):
    检查输入内容中的【饮食/行为】是否严重违背该体质 (${constitution}) 的养生原则？
    - 如果有风险：生成一条简短、醒目的提示 (risk_warning)，语气温和但有警示性。
    - 如果无风险：risk_warning 返回 null。
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
      const result = JSON.parse(response.text || "{}");
      const finalDate = result.intended_date || currentTimestamp.toLocaleDateString('zh-CN');
      
      return { 
        date: finalDate, 
        items: (result.items || []).map((item: any) => ({
          id: Date.now().toString() + Math.random(),
          date: finalDate, 
          activity: item.activity, 
          // FORCE DEFAULT TO 0.5 IF AI RETURNS 0 or NULL
          hours: (item.hours && item.hours > 0) ? item.hours : 0.5, 
          completed: true
        })),
        riskWarning: result.risk_warning || null
      };
    } catch (e) { return { date: currentTimestamp.toLocaleDateString('zh-CN'), items: [], riskWarning: null }; }
  }

  async generateDailyInsight(logs: DailyLog[], items: DoneItem[], profile: UserProfile): Promise<string> {
    if (!this.ai) return "今天辛苦了。";
    // Explicitly emphasizing TASKS in the prompt
    const prompt = `
    ${this.getProfileContext(profile)}
    
    【今日成就清单 (Work/Study/Exercise - 必须夸奖)】:
    ${items.length > 0 ? items.map(i => `- ${i.activity} (${i.hours}h)`).join('\n') : "无明确任务记录"}

    【今日身心碎碎念 (Body/Mind/Diet)】:
    ${logs.map(l => l.content).join('; ')}

    请生成温暖的“今日复盘”：
    1. **核心任务**：首先查看【今日成就清单】，如果有记录（如面试、学习、工作），**必须**在开头给予肯定和鼓励！不要忽略它们。
    2. **关怀身心**：结合碎碎念中的情绪或身体感受给予回应。
    3. **老己寄语**：简短的金句。

    语气要求：像老友一样温暖，不要像机器人列清单。
    `;
    const response = await this.ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { systemInstruction: WARM_INSTRUCTION } });
    return response.text || "晚安。";
  }

  async chatDiagnosis(history: ChatMessage[], profile: UserProfile): Promise<string> {
    if (!this.ai) return "Key 未设置";
    
    const contextPrompt = `
    [当前用户档案] 姓名: ${profile.name}, 年龄: ${profile.age}, 性别: ${profile.gender}, 病史: ${profile.history}
    
    [对话历史]
    ${history.map(h => `${h.role === 'user' ? '用户' : '医师'}: ${h.content}`).join('\n')}
    
    请根据《中医体质分类与判定》继续进行问诊。如果信息足够，请下结论并返回 JSON。
    `;

    try {
        const response = await this.ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: contextPrompt, 
            config: { 
                systemInstruction: DIAGNOSIS_INSTRUCTION,
                temperature: 0.5 
            } 
        });
        return response.text || "...";
    } catch (e) {
        return "诊断连接不稳定，请稍后重试。";
    }
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

  async generateCycleAnalysis(cycleIndex: number, habits: Habit[], logs: DailyLog[], profile: UserProfile): Promise<string> {
      if (!this.ai) return "需要 Key 才能深入分析哦。";
      
      const cycleHabits = habits.map(h => ({
          name: h.name,
          completion: h.history[cycleIndex]?.filter(Boolean).length || 0
      }));

      const logsText = logs.slice(0, 15).map(l => l.content).join('; ');

      const prompt = `
      ${this.getProfileContext(profile)}
      【第 ${cycleIndex} 周期（10天）修行数据】
      习惯完成度：${JSON.stringify(cycleHabits)}
      相关身心碎碎念：${logsText}

      请生成一份简要的“修行周报”：
      1. **习惯达成**：评价这10天的自律程度。
      2. **身体状况**：从中医视角分析这阶段的身体趋势。
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
