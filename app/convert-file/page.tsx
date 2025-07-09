import React from 'react'
import Converter from '../components/Converter'

const page = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100 p-2 sm:p-6">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 mt-8 text-center drop-shadow-lg">File Converter Tool</h1>
      <div className="w-full max-w-4xl flex flex-col items-center justify-center">
        <Converter />
      </div>
    </div>
  )
}

export default page