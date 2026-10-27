import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** Falla si axe encuentra violaciones serias o críticas de WCAG 2.1 AA en la página. */
export async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  const summary = blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodo(s) — ${v.help}`)
  expect(summary, 'Violaciones de accesibilidad').toEqual([])
}
