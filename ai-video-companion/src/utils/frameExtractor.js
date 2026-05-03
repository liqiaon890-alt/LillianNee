/**
 * 从视频文件均匀提取关键帧，返回 base64 JPEG 数组（不含 data URI 前缀）
 */
export async function extractFrames(file, count = 4) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.src = url

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('视频加载失败，请检查文件格式'))
    }

    video.onloadedmetadata = () => {
      const duration = video.duration
      if (!duration || !isFinite(duration)) {
        URL.revokeObjectURL(url)
        reject(new Error('无法读取视频时长'))
        return
      }

      const canvas = document.createElement('canvas')
      const scale = Math.min(1, 640 / (video.videoWidth || 640))
      canvas.width = Math.round((video.videoWidth || 640) * scale)
      canvas.height = Math.round((video.videoHeight || 360) * scale)
      const ctx = canvas.getContext('2d')

      const frames = []
      let i = 0

      const capture = () => {
        if (i >= count) {
          URL.revokeObjectURL(url)
          resolve({ frames, duration })
          return
        }
        // 均匀分布，跳过首尾 2%
        video.currentTime = duration * (0.02 + (0.96 / count) * i)
      }

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        frames.push(
          canvas.toDataURL('image/jpeg', 0.75).replace(/^data:image\/jpeg;base64,/, '')
        )
        i++
        capture()
      }

      capture()
    }
  })
}
