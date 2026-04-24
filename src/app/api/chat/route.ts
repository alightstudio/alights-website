import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `你是栖光文化的 AI 客服助手。栖光文化是一家专业的影视制作公司，位于西安。

【公司信息】
- 公司全称：西安栖光文化传播有限公司
- 主营业务：TVC广告、产品动画、产品发布会、影视剧视效
- 联系方式：电话 15091855505，邮箱 184436962@qq.com
- 作品展示：https://www.xinpianchang.com/u12018057

【服务范围】
1. TVC广告制作 - 品牌广告、产品广告、企业形象片
2. 产品动画 - 3D产品展示、功能演示动画
3. 发布会 - 产品发布会视觉内容、舞台背景
4. 影视剧视效 - 电影电视剧特效制作

【常见问答】
Q: 你们做什么类型的视频？
A: 我们专注于 TVC 广告、产品动画、产品发布会内容和影视剧视效制作。

Q: 制作周期多久？
A: 根据项目复杂度，一般 TVC 广告 2-4 周，产品动画 1-3 周，发布会内容 1-2 周。具体周期需要根据脚本和制作要求评估。

Q: 怎么收费？
A: 我们的报价根据项目类型、时长、制作难度等因素确定。建议您留下联系方式，我们会安排专人为您提供详细报价。

Q: 能看一下案例吗？
A: 我们的作品可以在新片场查看：https://www.xinpianchang.com/u12018057，包括现代汽车、奔驰、FILA、自然堂等品牌的合作案例。

【回复原则】
- 语气专业、友好、简洁
- 对于不清楚的问题，引导用户留下联系方式
- 不要编造具体的价格数字
- 强调可以电话或邮件详细沟通

用户问题：
`

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      )
    }

    // 构建对话历史
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-6), // 只保留最近6条上下文
      { role: 'user', content: message },
    ]

    // 调用 AI 模型 API
    // 这里使用 OpenRouter 或其他兼容 OpenAI API 的服务
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY
    const apiUrl = process.env.OPENAI_API_URL || 'https://openrouter.ai/api/v1/chat/completions'

    if (!apiKey) {
      // 如果没有配置 API Key，使用预设回复
      const fallbackResponse = getFallbackResponse(message)
      return NextResponse.json({ response: fallbackResponse })
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://alights.cn',
        'X-Title': '栖光文化 AI 客服',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'anthropic/claude-3.5-sonnet',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('AI API error:', error)
      const fallbackResponse = getFallbackResponse(message)
      return NextResponse.json({ response: fallbackResponse })
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content || getFallbackResponse(message)

    return NextResponse.json({ response: aiResponse })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { response: '抱歉，服务暂时不可用。请拨打 15091855505 联系我们。' },
      { status: 200 }
    )
  }
}

// 预设回复（当 AI API 不可用时使用）
function getFallbackResponse(message: string): string {
  const lowerMsg = message.toLowerCase()

  if (lowerMsg.includes('价格') || lowerMsg.includes('收费') || lowerMsg.includes('多少钱') || lowerMsg.includes('怎么收费')) {
    return '我们的报价根据项目类型、时长、制作难度等因素确定。不同的项目需求价格差异较大，建议您留下联系方式（电话或邮箱），我们会安排专人为您提供详细报价方案。'
  }

  if (lowerMsg.includes('周期') || lowerMsg.includes('多久') || lowerMsg.includes('时间') || lowerMsg.includes('几天')) {
    return '制作周期根据项目复杂度而定：一般 TVC 广告 2-4 周，产品动画 1-3 周，发布会内容 1-2 周。具体周期需要根据脚本和制作要求评估，我们可以根据您的时间要求调整制作计划。'
  }

  if (lowerMsg.includes('案例') || lowerMsg.includes('作品') || lowerMsg.includes('看看') || lowerMsg.includes('样片')) {
    return '我们的作品可以在新片场查看：https://www.xinpianchang.com/u12018057。案例包括现代汽车、奔驰、FILA、自然堂、零跑汽车等知名品牌的 TVC 广告和视觉内容制作。'
  }

  if (lowerMsg.includes('做什么') || lowerMsg.includes('业务') || lowerMsg.includes('服务') || lowerMsg.includes('类型')) {
    return '我们专注于以下业务：1）TVC 广告制作（品牌广告、产品广告、企业形象片）；2）产品动画（3D产品展示、功能演示动画）；3）发布会（产品发布会视觉内容、舞台背景）；4）影视剧视效（电影电视剧特效制作）。'
  }

  if (lowerMsg.includes('联系') || lowerMsg.includes('电话') || lowerMsg.includes('邮箱') || lowerMsg.includes('怎么找')) {
    return '您可以通过以下方式联系我们：电话 15091855505（同微信），邮箱 184436962@qq.com。工作日 9:00-18:00 在线，期待与您的合作！'
  }

  if (lowerMsg.includes('你好') || lowerMsg.includes('在吗') || lowerMsg.includes('hi') || lowerMsg.includes('hello')) {
    return '您好！我是栖光文化的 AI 助手。我可以帮您了解我们的服务、作品案例，或者解答关于影视制作的问题。请问有什么可以帮您的？'
  }

  return '感谢您的咨询！这个问题我需要进一步确认。建议您拨打 15091855505 或发送邮件至 184436962@qq.com，我们的专业团队会为您提供详细解答。'
}
