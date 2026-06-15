<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const API = 'http://localhost:3000/api/documents'

interface DocItem {
  _id: string
  name: string
  type: string
  size: string
  content: string
  filePath: string
  status: string
  createdAt: string
}

// ========== 列表 ==========
const documents = ref<DocItem[]>([])
const loading = ref(false)
const searchKey = ref('')

const typeLabel: Record<string, string> = { pdf: 'PDF', word: 'Word', txt: 'TXT', excel: 'Excel' }

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function fetchDocs() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const params = searchKey.value ? `?keyword=${encodeURIComponent(searchKey.value)}` : ''
    const res = await fetch(`${API}${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.code === 200) {
      documents.value = json.data
    } else {
      ElMessage.error(json.message || '获取文档列表失败')
    }
  } catch {
    ElMessage.error('网络错误，请检查后端服务')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  fetchDocs()
}

onMounted(() => fetchDocs())

// ========== 上传 ==========
const uploadVisible = ref(false)
const uploadFile = ref<File | null>(null)
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function openUpload() {
  uploadFile.value = null
  uploadVisible.value = true
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  uploadFile.value = input.files?.[0] || null
}

async function handleUpload() {
  if (!uploadFile.value) {
    ElMessage.warning('请选择文件')
    return
  }
  uploading.value = true
  try {
    const token = localStorage.getItem('token')
    const form = new FormData()
    form.append('file', uploadFile.value)
    const res = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const json = await res.json()
    if (json.code === 201) {
      ElMessage.success('上传成功')
      uploadVisible.value = false
      fetchDocs()
    } else {
      ElMessage.error(json.message || '上传失败')
    }
  } catch {
    ElMessage.error('网络错误')
  } finally {
    uploading.value = false
  }
}

// ========== 查看 ==========
const viewVisible = ref(false)
const viewingDoc = ref<DocItem | null>(null)

async function handleView(row: DocItem) {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/${row._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.code === 200) {
      viewingDoc.value = json.data
      viewVisible.value = true
    } else {
      ElMessage.error('获取文档详情失败')
    }
  } catch {
    ElMessage.error('网络错误')
  }
}

// ========== 编辑 ==========
const editVisible = ref(false)
const editingDoc = ref<DocItem | null>(null)
const editForm = ref({ name: '', content: '' })
const editing = ref(false)

function openEdit(row: DocItem) {
  editingDoc.value = row
  editForm.value = { name: row.name, content: row.content || '' }
  editVisible.value = true
}

async function handleEdit() {
  if (!editingDoc.value) return
  editing.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/${editingDoc.value._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editForm.value),
    })
    const json = await res.json()
    if (json.code === 200) {
      ElMessage.success('更新成功')
      editVisible.value = false
      fetchDocs()
    } else {
      ElMessage.error(json.message || '更新失败')
    }
  } catch {
    ElMessage.error('网络错误')
  } finally {
    editing.value = false
  }
}

// ========== 删除 ==========
async function handleDelete(row: DocItem) {
  try {
    await ElMessageBox.confirm(`确定要删除「${row.name}」吗？此操作不可恢复。`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/${row._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.code === 200) {
      ElMessage.success('删除成功')
      fetchDocs()
    } else {
      ElMessage.error(json.message || '删除失败')
    }
  } catch {
    ElMessage.error('网络错误')
  }
}
</script>

<template>
  <div class="knowledge-page">
    <h2 class="page-title">知识库管理</h2>

    <div class="toolbar">
      <el-input
        v-model="searchKey"
        placeholder="搜索文档名称..."
        style="width: 260px"
        @keyup.enter="handleSearch"
        clearable
      >
        <template #prefix>
          <Icon icon="mdi:magnify" width="16" />
        </template>
      </el-input>
      <div class="toolbar-right">
        <el-button @click="handleSearch">
          <Icon icon="mdi:magnify" width="16" />
          搜索
        </el-button>
        <el-button type="primary" @click="openUpload">
          <Icon icon="mdi:file-upload-outline" width="16" />
          上传文档
        </el-button>
      </div>
    </div>

    <div class="table-wrap" v-loading="loading">
      <el-table :data="documents" stripe style="width:100%" empty-text="暂无文档，请上传">
        <el-table-column prop="name" label="文档名称" min-width="220" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'pdf' ? 'danger' : row.type === 'word' ? 'primary' : row.type === 'excel' ? 'success' : 'success'">
              {{ typeLabel[row.type] || row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="size" label="大小" width="90" />
        <el-table-column label="上传时间" width="120">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === '已入库' ? 'success' : row.status === '处理中' ? 'warning' : 'danger'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="handleView(row)">查看</el-button>
            <el-button size="small" text type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- ====== 上传弹窗 ====== -->
    <el-dialog v-model="uploadVisible" title="上传文档" width="500px" :close-on-click-modal="false">
      <div class="upload-area" @click="fileInputRef?.click()">
        <input ref="fileInputRef" type="file" accept=".pdf,.doc,.docx,.txt,.xlsx" class="file-hidden" @change="onFileChange" />
        <template v-if="uploadFile">
          <Icon icon="mdi:file-document-outline" width="40" class="file-icon" />
          <span class="file-name">{{ uploadFile.name }}</span>
          <span class="file-size">{{ (uploadFile.size / 1024 / 1024).toFixed(2) }}MB</span>
          <el-button size="small" text type="danger" @click.stop="uploadFile = null">移除</el-button>
        </template>
        <template v-else>
          <Icon icon="mdi:cloud-upload-outline" width="40" class="upload-icon" />
          <span class="upload-hint">点击选择文件</span>
          <span class="upload-sub">支持 PDF、Word、TXT、Excel，最大 50MB</span>
        </template>
      </div>
      <template #footer>
        <el-button @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" :disabled="!uploadFile" @click="handleUpload">
          确认上传
        </el-button>
      </template>
    </el-dialog>

    <!-- ====== 查看弹窗 ====== -->
    <el-dialog v-model="viewVisible" :title="viewingDoc?.name" width="700px">
      <div v-if="viewingDoc" class="view-body">
        <div class="view-meta">
          <el-tag size="small" :type="viewingDoc.type === 'pdf' ? 'danger' : viewingDoc.type === 'word' ? 'primary' : 'success'">
            {{ typeLabel[viewingDoc.type] || viewingDoc.type }}
          </el-tag>
          <span>大小：{{ viewingDoc.size }}</span>
          <span>状态：{{ viewingDoc.status }}</span>
          <span>上传时间：{{ formatDate(viewingDoc.createdAt) }}</span>
        </div>
        <div class="view-content">{{ viewingDoc.content || '(无文本内容)' }}</div>
      </div>
    </el-dialog>

    <!-- ====== 编辑弹窗 ====== -->
    <el-dialog v-model="editVisible" title="编辑文档" width="600px" :close-on-click-modal="false">
      <div class="edit-form">
        <label class="edit-label">文档名称</label>
        <el-input v-model="editForm.name" placeholder="文档名称" />
        <label class="edit-label">文档内容</label>
        <el-input
          v-model="editForm.content"
          type="textarea"
          :rows="12"
          placeholder="可修改提取后的文本内容，用于 AI 检索"
        />
      </div>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editing" @click="handleEdit">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.knowledge-page {
  padding: 24px;
}

.page-title {
  font-size: 22px;
  color: #333;
  margin: 0 0 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.table-wrap {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

/* 上传区域 */
.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.upload-area:hover {
  border-color: #667eea;
}

.file-hidden {
  display: none;
}

.upload-icon {
  color: #ccc;
}

.upload-hint {
  font-size: 15px;
  color: #666;
}

.upload-sub {
  font-size: 12px;
  color: #bbb;
}

.file-icon {
  color: #667eea;
}

.file-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.file-size {
  font-size: 12px;
  color: #999;
}

/* 查看 */
.view-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.view-meta {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 13px;
  color: #888;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.view-content {
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.8;
  color: #444;
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}

/* 编辑 */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-label {
  font-size: 13px;
  color: #666;
  margin: 0;
}
</style>
