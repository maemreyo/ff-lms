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
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      const value = data[condition]
      if (value && (Array.isArray(value) ? value.length > 0 : Boolean(value))) {
        return this.processInnerContent(content, data)
      }
      return ''
    })

    // Handle {{#each array}} blocks
    result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, content) => {
      const array = data[arrayName]
      if (Array.isArray(array)) {
        return array.map((item, index) => {
          return this.processEachItem(content, item, index)
        }).join('\n')
      }
      return ''
    })

    // Handle simple variable substitutions
    result = result.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return String(data[variable] || '')
    })

    return result
  }

  private static processInnerContent(content: string, data: TemplateData): string {
    // Process nested {{#each}} within {{#if}} blocks
    let result = content.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, innerContent) => {
      const array = data[arrayName]
      if (Array.isArray(array)) {
        return array.map((item, index) => {
          return this.processEachItem(innerContent, item, index)
        }).join('\n')
      }
      return ''
    })

    // Handle simple variables in inner content
    result = result.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return String(data[variable] || '')
    })

    return result.trim()
  }

  private static processEachItem(content: string, item: any, index: number): string {
    return content
      .replace(/\{\{@index\}\}/g, index.toString())
      .replace(/\{\{this\.(\w+)\}\}/g, (match, property) => {
        return String(item[property] || '')
      })
      .replace(/\{\{this\}\}/g, String(item))
  }
}