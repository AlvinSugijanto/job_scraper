import { FormProvider as Form } from 'react-hook-form'

// ----------------------------------------------------------------------

export default function FormProvider({ children, onSubmit, methods, className }) {
  return (
    <Form {...methods}>
      <form onSubmit={onSubmit} className={className}>
        {children}
      </form>
    </Form>
  )
}
