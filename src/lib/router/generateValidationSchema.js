import { t } from 'elysia';
import { commonTypes } from '@lib/datastore/commonTypes';

// Fields that are typically auto-generated and don't require manual input
const AUTO_GENERATED_FIELDS = ['id', 'createdAt', 'updatedAt'];

/**
 * Generates a validation schema for a given model schema.
 *
 * @param {Object} modelSchema - The model schema to generate validations for.
 * @param {boolean} excludeAutoFields - Whether to exclude auto-generated fields from the validation schema.
 * @returns {Object} A validation schema object compatible with Elysia's type system.
 */
export function generateValidationSchema(
  modelSchema,
  excludeAutoFields = false
) {
  const validationSchema = {};

  for (const [fieldName, fieldDefinition] of Object.entries(
    modelSchema.columns
  )) {
    // Skip auto-generated fields if excludeAutoFields is true
    if (excludeAutoFields && AUTO_GENERATED_FIELDS.includes(fieldName)) {
      continue;
    }

    const commonType = commonTypes[fieldDefinition.type];

    if (!commonType) {
      console.warn(`Unknown type for field ${fieldName}. Skipping validation.`);
      continue;
    }

    let fieldSchema;

    // Check for custom validation first
    if (fieldDefinition.validation) {
      fieldSchema = fieldDefinition.validation;
    } else {
      // Map common types to Elysia types
      switch (commonType.elysiaType) {
        case 'String':
          fieldSchema = t.String();
          break;
        case 'Integer':
          fieldSchema = t.Integer();
          break;
        case 'Number':
          fieldSchema = t.Number();
          break;
        case 'Boolean':
          fieldSchema = t.Boolean();
          break;
        case 'Date':
          fieldSchema = t.Date();
          break;
        case 'Any':
          fieldSchema = t.Any();
          break;
        case 'Unknown':
          fieldSchema = t.Unknown();
          break;
        default:
          console.warn(
            `Unsupported Elysia type for field ${fieldName}. Using 'Any' type.`
          );
          fieldSchema = t.Any();
      }
    }

    // Apply additional constraints based on field definition
    if (fieldDefinition.nullable) {
      fieldSchema = t.Optional(t.Union([fieldSchema, t.Null()]));
    }
    if (fieldDefinition.default !== undefined) {
      fieldSchema = t.Optional(fieldSchema);
    }

    // Add any custom validators defined in the model schema
    if (fieldDefinition.validate) {
      fieldSchema = t.Transform(fieldSchema, (value) => {
        if (!fieldDefinition.validate(value)) {
          throw new Error(`Validation failed for field ${fieldName}`);
        }
        return value;
      });
    }

    validationSchema[fieldName] = fieldSchema;
  }

  // Handle relations (keep this part unchanged)
  // ...

  return t.Object(validationSchema);
}

/**
 * Generates blueprint validations for CRUD operations on a model.
 *
 * @param {Object} modelSchema - The model schema to generate validations for.
 * @returns {Object} An object containing validation schemas for create, update, readAll, readOne, and delete operations.
 */
export function generateBlueprintValidations(modelSchema) {
  const baseSchema = generateValidationSchema(modelSchema);
  const inputSchema = generateValidationSchema(modelSchema, true); // Exclude auto-generated fields

  // Define a common error response schema
  const errorResponse = t.Object({
    message: t.Optional(t.String()),
    error: t.String(),
  });

  return {
    create: {
      body: inputSchema,
      response: {
        201: baseSchema,
        400: errorResponse,
        500: errorResponse,
      },
    },
    update: {
      params: t.Object({
        id: t.Union([t.String(), t.Number()]),
      }),
      body: t.Partial(inputSchema),
      response: {
        200: baseSchema,
        400: errorResponse,
        404: errorResponse,
        500: errorResponse,
      },
    },
    readAll: {
      query: t.Object({
        skip: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
        where: t.Optional(t.String()),
        sort: t.Optional(t.String()),
        populate: t.Optional(t.String()),
      }),
      response: {
        200: t.Array(baseSchema),
        400: errorResponse,
        500: errorResponse,
      },
    },
    readOne: {
      params: t.Object({
        id: t.Union([t.String(), t.Number()]),
      }),
      query: t.Object({
        populate: t.Optional(t.String()),
      }),
      response: {
        200: baseSchema,
        404: errorResponse,
        500: errorResponse,
      },
    },
    delete: {
      params: t.Object({
        id: t.Union([t.String(), t.Number()]),
      }),
      response: {
        200: t.Object({ message: t.String() }),
        404: errorResponse,
        500: errorResponse,
      },
    },
  };
}
