import React, { useState } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { OrgAdminNavbar } from '@components/layout/orgadmin/OrgAdminNavbar'
import { OrgAdminSidebar } from '@components/layout/orgadmin/OrgAdminSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { MOCK_MODULES, MockModule, MockContent } from '@/review/reviewData'

export const CourseEditorReview: React.FC = () => {
  const [modules, setModules] = useState<MockModule[]>(MOCK_MODULES)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set(['mod-1']))

  const toggleModule = (id: string) =>
    setOpenModules((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleContentStatus = (moduleId: string, contentId: string) =>
    setModules((prev) =>
      prev.map((m) =>
        m.id !== moduleId
          ? m
          : {
              ...m,
              contents: m.contents.map((c) =>
                c.id !== contentId
                  ? c
                  : { ...c, status: c.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }
              ),
            }
      )
    )

  return (
    <MainLayout
      navbar={<OrgAdminNavbar title="Course Editor — Curriculum" />}
      sidebar={<OrgAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-on-surface font-headline mb-2">Course Editor — Curriculum</h2>
            <p className="text-on-surface-variant">Manage modules and content items for this course</p>
          </div>

          <Card className="p-6 flex items-center justify-between">
            <span className="text-sm text-on-surface-variant">Advanced Quantum Mechanics</span>
            <Button size="sm">+ Add Module</Button>
          </Card>

          <div className="space-y-4">
            {modules.map((module, mIdx) => (
              <div key={module.id} className="rounded-lg border border-outline-variant overflow-hidden">
                {/* Module header */}
                <div className="p-4 bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="p-1 rounded hover:bg-surface-container"
                    >
                      <MaterialIcon icon={openModules.has(module.id) ? 'expand_less' : 'expand_more'} />
                    </button>
                    <span className="text-sm font-bold text-on-surface-variant">#{mIdx + 1}</span>
                    <span className="font-semibold text-on-surface">{module.title}</span>
                    <Badge variant="secondary" size="sm">{module.contents.length} items</Badge>
                  </div>
                  <div className="flex gap-1">
                    <button
                      disabled={mIdx === 0}
                      className="p-1 rounded hover:bg-surface-container disabled:opacity-30"
                      title="Move up"
                    >
                      <MaterialIcon icon="keyboard_arrow_up" />
                    </button>
                    <button
                      disabled={mIdx === modules.length - 1}
                      className="p-1 rounded hover:bg-surface-container disabled:opacity-30"
                      title="Move down"
                    >
                      <MaterialIcon icon="keyboard_arrow_down" />
                    </button>
                    <button className="p-1 rounded hover:bg-error-container text-error" title="Delete module">
                      <MaterialIcon icon="delete" />
                    </button>
                  </div>
                </div>

                {/* Content items */}
                {openModules.has(module.id) && (
                  <div className="p-4 space-y-2 border-t border-outline-variant">
                    {module.contents.map((content: MockContent, cIdx) => (
                      <div
                        key={content.id}
                        className="ml-6 p-3 rounded-lg bg-surface-container flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <MaterialIcon icon="drag_indicator" className="text-on-surface-variant text-sm" />
                          <span className="text-sm text-on-surface">{content.title}</span>
                          <Badge variant={content.status === 'PUBLISHED' ? 'success' : 'warning'} size="sm">
                            {content.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                          </Badge>
                          <Badge variant="secondary" size="sm">{content.contentType}</Badge>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            disabled={cIdx === 0}
                            className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30"
                            title="Move up"
                          >
                            <MaterialIcon icon="keyboard_arrow_up" className="text-sm" />
                          </button>
                          <button
                            disabled={cIdx === module.contents.length - 1}
                            className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30"
                            title="Move down"
                          >
                            <MaterialIcon icon="keyboard_arrow_down" className="text-sm" />
                          </button>
                          <button
                            onClick={() => toggleContentStatus(module.id, content.id)}
                            className="p-1 rounded hover:bg-surface-container-high text-xs text-primary"
                            title={content.status === 'PUBLISHED' ? 'Set Draft' : 'Publish'}
                          >
                            <MaterialIcon
                              icon={content.status === 'PUBLISHED' ? 'unpublished' : 'publish'}
                              className="text-sm"
                            />
                          </button>
                          <button className="p-1 rounded hover:bg-error-container text-error" title="Delete">
                            <MaterialIcon icon="delete" className="text-sm" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button className="ml-6 mt-2 text-sm text-primary hover:underline">+ Add Content</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
