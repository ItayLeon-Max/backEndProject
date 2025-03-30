import { Router } from "express";
import { addDevelopmentGroup, deleteDevelopmentGroup, getAllDevelopmentGroups, updateDevelopmentGroup } from "../../controllers/developmentGroup/controller";
import validation from "../../middlewares/validation";
import { newDevelopmentGroupValidator, updateDevelopmentGroupValidator } from "../../controllers/developmentGroup/validation";


const developmentGroupRouter = Router()

//developmentGroup routes
developmentGroupRouter.get('/', getAllDevelopmentGroups)
developmentGroupRouter.post('/', validation(newDevelopmentGroupValidator) ,addDevelopmentGroup)
developmentGroupRouter.delete('/:id', deleteDevelopmentGroup)
developmentGroupRouter.put('/:id', validation(updateDevelopmentGroupValidator) ,updateDevelopmentGroup)

export default developmentGroupRouter