import { describe, it, expect } from 'vitest'
import { execPostRequestTool } from '../src/utils/apiTools'

const schema = execPostRequestTool.schema

describe('execPostRequestTool Schema Validation', () => {
  it('should validate correct parameters', () => {
    const validParams = {
      endpoint: '/test-endpoint',
      body: { test: 'data' }
    }
    const result = schema.parse(validParams)
    expect(result).toEqual(validParams)
  })

  it('should fail validation when body is missing', () => {
    const missingBodyParams = {
      endpoint: '/test-endpoint'
    }
    expect(() => schema.parse(missingBodyParams)).toThrow()
  })

  it('should fail validation when body is empty', () => {
    const emptyBodyParams = {
      endpoint: '/test-endpoint',
      body: {}
    }
    expect(() => schema.parse(emptyBodyParams)).toThrow()
  })
})
