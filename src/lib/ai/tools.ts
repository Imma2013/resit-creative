export type EditorTool = { name: string; description: string; namespace: 'design' | 'video' | 'social' | 'assets' | 'generate' };

export const editorTools: EditorTool[] = [
  { name: 'design.add_element', namespace: 'design', description: 'Add a text, image, or shape element to the active design.' },
  { name: 'design.update_element', namespace: 'design', description: 'Update an existing design element position, size, text, or style.' },
  { name: 'design.delete_element', namespace: 'design', description: 'Delete an element from the active design.' },
  { name: 'design.move_element', namespace: 'design', description: 'Move an element to a new x/y position.' },
  { name: 'design.resize_element', namespace: 'design', description: 'Resize an element.' },
  { name: 'design.export', namespace: 'design', description: 'Export the active design.' },
  { name: 'video.add_clip', namespace: 'video', description: 'Add a media clip to the active timeline.' },
  { name: 'video.split_clip', namespace: 'video', description: 'Split a video clip at a timeline position.' },
  { name: 'video.trim_clip', namespace: 'video', description: 'Trim a clip start or end.' },
  { name: 'video.move_clip', namespace: 'video', description: 'Move a clip to another timeline position or track.' },
  { name: 'video.delete_clip', namespace: 'video', description: 'Delete a clip.' },
  { name: 'video.add_text', namespace: 'video', description: 'Add text or captions to a video.' },
  { name: 'social.create_post', namespace: 'social', description: 'Create a draft social post.' },
  { name: 'social.schedule_post', namespace: 'social', description: 'Schedule a post for a connected social account.' },
  { name: 'social.get_calendar', namespace: 'social', description: 'Read scheduled and draft posts.' },
  { name: 'assets.search', namespace: 'assets', description: 'Search the project asset library.' },
  { name: 'generate.image', namespace: 'generate', description: 'Generate an image and add it to the project asset library.' },
  { name: 'generate.video', namespace: 'generate', description: 'Generate a video and add it to the project asset library.' },
];
