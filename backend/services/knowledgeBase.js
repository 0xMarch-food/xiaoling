/**
 * 知识库检索服务 (RAG — Retrieval Augmented Generation)
 *
 * 利用 MongoDB 的 $text 全文索引从知识库文档中检索相关内容，
 * 作为大模型 Prompt 的上下文注入，提升回答准确性。
 */

import Document from '../models/Document.js'

/**
 * 根据用户问题检索知识库中最相关的文档片段
 * @param {string} question - 用户问题
 * @param {number} limit - 返回数量（默认 3）
 * @returns {Promise<Array<{name: string, content: string}>>}
 */
export async function searchKnowledge(question, limit = 3) {
  // MongoDB $text 搜索要求搜索词不能为空
  const searchText = question.trim()
  if (!searchText) return []

  try {
    const docs = await Document.find(
      { $text: { $search: searchText } },
      { score: { $meta: 'textScore' }, name: 1, content: 1 },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)

    // 截取内容前 500 字符，避免 Prompt 过长
    return docs.map(doc => ({
      name: doc.name,
      content: doc.content.substring(0, 500),
    }))
  } catch (err) {
    // $text 搜索可能因索引不存在而失败 → 降级为空结果
    console.warn('[KnowledgeBase] 全文检索失败:', err.message)
    return []
  }
}
