'use client'

import { useParams } from 'next/navigation'
import WorkflowEditor from '../components/workflow-editor'

export default function EditWorkflowPage() {
  const params = useParams()
  const workflowId = params?.id as string

  return <WorkflowEditor workflowId={workflowId} />
}
