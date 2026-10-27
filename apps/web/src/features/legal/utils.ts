/** "01", "02"… para numerar secciones de forma editorial. */
export const sectionNumber = (index: number) => String(index + 1).padStart(2, '0')
