import {
  academicYearsResponseSchema,
  classesResponseSchema,
  gradesResponseSchema,
  semestersResponseSchema,
  subjectsResponseSchema,
  unitsResponseSchema,
} from '@learnspace/contracts';
import { resourceMembershipFor } from '../utils/resource-access.js';
import type { AcademicsService } from '../service/academics-service.js';
import type { RequestHandler } from '../type/http.js';

export function createAcademicsController(service: AcademicsService) {
  const collection =
    (
      load: keyof AcademicsService,
      schema:
        | typeof academicYearsResponseSchema
        | typeof semestersResponseSchema
        | typeof unitsResponseSchema
        | typeof gradesResponseSchema
        | typeof classesResponseSchema
        | typeof subjectsResponseSchema,
    ): RequestHandler =>
    async (request, response, next) => {
      try {
        const organizationId = request.params.organizationId;
        const membership = resourceMembershipFor(request, organizationId);
        const data = await (
          service[load] as (
            id: string,
            scope: typeof membership,
          ) => Promise<unknown[]>
        )(organizationId, membership);
        response.json(schema.parse({ data, meta: { count: data.length } }));
      } catch (error) {
        next(error);
      }
    };

  return {
    listAcademicYears: collection(
      'listAcademicYears',
      academicYearsResponseSchema,
    ),
    listSemesters: collection('listSemesters', semestersResponseSchema),
    listUnits: collection('listUnits', unitsResponseSchema),
    listGrades: collection('listGrades', gradesResponseSchema),
    listClasses: collection('listClasses', classesResponseSchema),
    listSubjects: collection('listSubjects', subjectsResponseSchema),
  };
}
