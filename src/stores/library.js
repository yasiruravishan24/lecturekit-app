import { defineStore } from 'pinia'
import * as lib from '../api/library'
import { isBusy } from '../util/status'

// Courses, modules and sessions of the logged-in user, kept together so the drawer, the dashboard and the course pages agree.
export const useLibraryStore = defineStore('library', {
  state: () => ({ courses: [], loaded: false, loading: false }),
  getters: {
    // flat list of every session with the names of its module and course
    allSessions: (s) => s.courses.flatMap((c) => c.modules.flatMap((m) => m.sessions.map((x) => ({ ...x, module_name: m.name, course_id: c.id, course_name: c.name })))),
    counts() {
      const all = this.allSessions
      return {
        courses: this.courses.length,
        modules: this.courses.reduce((n, c) => n + c.modules.length, 0),
        lectures: all.length,
        ready: all.filter((x) => x.state === 'done').length,
        processing: all.filter(isBusy).length,
      }
    },
    anyBusy() { return this.allSessions.some(isBusy) },
    course: (s) => (id) => s.courses.find((c) => c.id === Number(id)),
    module: (s) => (id) => {
      for (const c of s.courses) {
        const m = c.modules.find((x) => x.id === Number(id))
        if (m) return { ...m, course: c }
      }
      return null
    },
    session() {
      return (id) => this.allSessions.find((x) => x.id === Number(id)) || null
    },
  },
  actions: {
    async load(force = false) {
      if (this.loading || (this.loaded && !force)) return
      this.loading = true
      try {
        const courses = await lib.listCourses()
        this.courses = await Promise.all(courses.map(async (c) => {
          const modules = await lib.listModules(c.id)
          return { ...c, modules: await Promise.all(modules.map(async (m) => ({ ...m, sessions: await lib.listSessions(m.id) }))) }
        }))
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
    async refresh() { await this.load(true) },
    reset() { this.courses = []; this.loaded = false },

    async addCourse(name) { const c = await lib.createCourse(name); await this.refresh(); return c },
    async renameCourse(id, name) { await lib.renameCourse(id, name); await this.refresh() },
    async removeCourse(id) { await lib.deleteCourse(id); await this.refresh() },
    async addModule(courseId, name) { const m = await lib.createModule(courseId, name); await this.refresh(); return m },
    async renameModule(id, name) { await lib.renameModule(id, name); await this.refresh() },
    async removeModule(id) { await lib.deleteModule(id); await this.refresh() },
    async renameSession(id, title) { await lib.renameSession(id, title); await this.refresh() },
    async removeSession(id) { await lib.deleteSession(id); await this.refresh() },
  },
})
