import React from 'react'

// Treat any .jsx file's default export as a React component
declare module '*.jsx' {
  const Component: React.ComponentType<any>
  export default Component
}