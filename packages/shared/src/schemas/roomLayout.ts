import { z } from 'zod';

export const GridItemTypeSchema = z.enum(['student', 'teacher', 'obstacle', 'door'], {
  description: 'Type of grid item: student seat, teacher desk/area, obstacle, or door',
});

export const GridItemSchema = z.object({
  x: z.number().int().min(0).max(11, 'x coordinate must be at most 11'),
  y: z.number().int().min(0).max(11, 'y coordinate must be at most 11'),
  type: GridItemTypeSchema,
}).strict();

export const SaveRoomLayoutInputSchema = z.object({
  name: z.string().trim().min(1, 'Room name is required').max(100, 'Room name must be at most 100 characters'),
  grid: z.array(GridItemSchema).max(144, 'Grid must contain at most 144 items').superRefine((items, ctx) => {
    const occupied = new Set<string>();
    items.forEach((item, index) => {
      const coordinate = `${item.x},${item.y}`;
      if (occupied.has(coordinate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate grid coordinate: ${coordinate}`,
          path: [index],
        });
      }
      occupied.add(coordinate);
    });
  }),
  isActive: z.boolean().optional(),
}).strict();
