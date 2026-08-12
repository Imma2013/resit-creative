export type EditorTool = {
  name: string;
  namespace: 'design' | 'video' | 'social' | 'assets' | 'generate';
  description: string;
  parameters: Record<string, unknown>;
};

const elementProps = {
  type: 'OBJECT',
  properties: {
    type: { type: 'STRING', description: 'text, image, or shape' },
    x: { type: 'NUMBER' },
    y: { type: 'NUMBER' },
    width: { type: 'NUMBER' },
    height: { type: 'NUMBER' },
    text: { type: 'STRING' },
    background: { type: 'STRING' },
    color: { type: 'STRING' },
    fontSize: { type: 'NUMBER' },
    fontWeight: { type: 'NUMBER' }
  }
};

export const editorTools: EditorTool[] = [
  { name: 'design.add_element', namespace: 'design', description: 'Add one element to the active design canvas.', parameters: elementProps },
  { name: 'design.update_element', namespace: 'design', description: 'Update an existing element properties such as text or style.', parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, text: { type: 'STRING' }, background: { type: 'STRING' }, color: { type: 'STRING' }, fontSize: { type: 'NUMBER' }, fontWeight: { type: 'NUMBER' } }, required: ['id'] } },
  { name: 'design.move_element', namespace: 'design', description: 'Move an existing element to an x/y position on the canvas.', parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, x: { type: 'NUMBER' }, y: { type: 'NUMBER' } }, required: ['id', 'x', 'y'] } },
  { name: 'design.resize_element', namespace: 'design', description: 'Resize an existing element.', parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, width: { type: 'NUMBER' }, height: { type: 'NUMBER' } }, required: ['id', 'width', 'height'] } },
  { name: 'design.delete_element', namespace: 'design', description: 'Delete an existing element from the canvas.', parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' } }, required: ['id'] } },
  { name: 'design.export', namespace: 'design', description: 'Export the current design. Requires user confirmation before external publishing.', parameters: { type: 'OBJECT', properties: { format: { type: 'STRING' } }, required: ['format'] } },
  { name: 'video.add_clip', namespace: 'video', description: 'Add a media clip to the active timeline.', parameters: { type: 'OBJECT', properties: { name: { type: 'STRING' }, start: { type: 'NUMBER' }, duration: { type: 'NUMBER' } }, required: ['name'] } },
  { name: 'video.split_clip', namespace: 'video', description: 'Split a video clip at a timeline position.', parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, at: { type: 'NUMBER' } }, required: ['id', 'at'] } },
  { name: 'video.trim_clip', namespace: 'video', description: 'Trim a clip start or end.', parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, start: { type: 'NUMBER' }, end: { type: 'NUMBER' } }, required: ['id'] } },
  { name: 'video.move_clip', namespace: 'video', description: 'Move a clip on the timeline.', parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, start: { type: 'NUMBER' }, trackId: { type: 'STRING' } }, required: ['id', 'start'] } },
  { name: 'video.delete_clip', namespace: 'video', description: 'Delete a timeline clip.', parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' } }, required: ['id'] } },
  { name: 'video.add_text', namespace: 'video', description: 'Add text or captions to a video.', parameters: { type: 'OBJECT', properties: { text: { type: 'STRING' }, start: { type: 'NUMBER' }, duration: { type: 'NUMBER' } }, required: ['text'] } },
  { name: 'social.create_post', namespace: 'social', description: 'Create a draft social post.', parameters: { type: 'OBJECT', properties: { platform: { type: 'STRING' }, text: { type: 'STRING' } }, required: ['platform', 'text'] } },
  { name: 'social.schedule_post', namespace: 'social', description: 'Schedule a prepared social post.', parameters: { type: 'OBJECT', properties: { postId: { type: 'STRING' }, scheduledAt: { type: 'STRING' } }, required: ['postId', 'scheduledAt'] } },
  { name: 'social.get_calendar', namespace: 'social', description: 'Read scheduled and draft social posts.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'assets.search', namespace: 'assets', description: 'Search project assets.', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] } },
  { name: 'generate.image', namespace: 'generate', description: 'Generate an image asset for the project.', parameters: { type: 'OBJECT', properties: { prompt: { type: 'STRING' }, width: { type: 'NUMBER' }, height: { type: 'NUMBER' } }, required: ['prompt'] } },
  { name: 'generate.video', namespace: 'generate', description: 'Generate a video asset for the project.', parameters: { type: 'OBJECT', properties: { prompt: { type: 'STRING' }, duration: { type: 'NUMBER' } }, required: ['prompt'] } }
];
