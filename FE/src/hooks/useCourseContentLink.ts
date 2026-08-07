import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '@/utils/apiClient'

/**
 * Shared "create content for a course module" plumbing.
 *
 * A Teacher/OrgAdmin adds content to a course module by going through the SAME creation pages a
 * user uses (Quiz/Video/Deck creators, Document upload). Those pages are opened with
 * `?courseId=&moduleId=&returnTo=` in the URL; after the content is created they call
 * `linkAndReturn(contentId)`, which links the new content into the module and navigates back to
 * the course editor (OrgAdmin) or the course page (Teacher).
 */
export function useCourseContentLink() {
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const courseId = sp.get('courseId')
  const moduleId = sp.get('moduleId')
  const returnTo = sp.get('returnTo') // 'curriculum' (OrgAdmin) | 'course' (Teacher)
  const active = !!courseId && !!moduleId

  const destination = returnTo === 'course'
    ? `/user/course/${courseId}`
    : `/admin/editor/curriculum?courseId=${courseId}`

  // Link the content into the module WITHOUT navigating (e.g. a Deck: link the shell, keep editing
  // cards, then return separately). Safe to call when inactive (no-op). THROWS on failure so the
  // caller's catch surfaces the error to the user — a silent failure here was why "content created
  // in a course wasn't saved to the course" went unnoticed.
  const linkOnly = useCallback(async (contentId: string): Promise<boolean> => {
    if (!active || !contentId) return false
    try {
      const res = await apiClient.post(`/courses/${courseId}/modules/${moduleId}/contents/link`, { contentId })
      if (res && (res as { success?: boolean }).success === false) {
        throw new Error((res as { message?: string }).message || 'Failed to add the content to the course.')
      }
      return true
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      throw new Error(err?.data?.message || err?.message || 'Failed to add the content to the course.')
    }
  }, [active, courseId, moduleId])

  // Link then navigate back to the course. On failure linkOnly throws → the caller stays on the
  // page and shows the error (we do NOT navigate away on a failed link).
  const linkAndReturn = useCallback(async (contentId: string): Promise<boolean> => {
    await linkOnly(contentId)
    if (active) navigate(destination)
    return active
  }, [active, destination, navigate, linkOnly])

  const goBack = useCallback(() => { if (active) navigate(destination) }, [active, destination, navigate])

  // Preserve the course context as a query string when navigating between creation steps.
  const courseQuery = active ? `?courseId=${courseId}&moduleId=${moduleId}&returnTo=${returnTo ?? 'curriculum'}` : ''

  return { active, courseId, moduleId, destination, courseQuery, linkOnly, linkAndReturn, goBack }
}
