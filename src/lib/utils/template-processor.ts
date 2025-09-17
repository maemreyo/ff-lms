/**
 * Simple template processor for custom prompt templates
 * Handles basic Handlebars syntax like {{variable}}, {{#if}}, {{#each}}
 */

interface TemplateData {
  [key: string]: any
}

export class TemplateProcessor {
  static process(template: string, data: TemplateData): string {
    let result = template

    // Handle {{#if condition}} blocks
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, condition, content) => {
      const value = data[condition]
      if (value && (Array.isArray(value) ? value.length > 0 : Boolean(value))) {
        return this.processInnerContent(content, data)
      }
      return ''
    })

    // Handle {{#each array}} blocks
    result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, arrayName, content) => {
      const array = data[arrayName]
      if (Array.isArray(array)) {
        return array.map((item, index) => {
          return this.processEachItem(content, item, index)
        }).join('\n')
      }
      return ''
    })

    // Handle simple variable substitutions
    result = result.replace(/\{\{(\w+)\}\}/g, (_, variable) => {
      return String(data[variable] || '')
    })

    return result
  }

  private static processInnerContent(content: string, data: TemplateData): string {
    // Process nested {{#each}} within {{#if}} blocks
    let result = content.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, arrayName, innerContent) => {
      const array = data[arrayName]
      if (Array.isArray(array)) {
        return array.map((item, index) => {
          return this.processEachItem(innerContent, item, index)
        }).join('\n')
      }
      return ''
    })

    // Handle simple variables in inner content
    result = result.replace(/\{\{(\w+)\}\}/g, (_, variable) => {
      return String(data[variable] || '')
    })

    return result.trim()
  }

  private static processEachItem(content: string, item: any, index: number): string {
    let result = content

    // Handle {{@index}}
    result = result.replace(/\{\{@index\}\}/g, index.toString())

    // Handle {{this.property}} with nested object support
    result = result.replace(/\{\{this\.(\w+(?:\.\w+)*)\}\}/g, (_, property) => {
      const value = this.getNestedProperty(item, property)
      return String(value || '')
    })

    // Handle {{this}}
    result = result.replace(/\{\{this\}\}/g, String(item))

    return result
  }

  /**
   * Get nested property from object (e.g., 'a.b.c' from {a: {b: {c: 'value'}}})
   */
  private static getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, property) => {
      return current && current[property] !== undefined ? current[property] : undefined
    }, obj)
  }
}