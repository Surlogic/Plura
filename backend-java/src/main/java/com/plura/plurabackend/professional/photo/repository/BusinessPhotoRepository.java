package com.plura.plurabackend.professional.photo.repository;

import com.plura.plurabackend.professional.photo.model.BusinessPhoto;
import com.plura.plurabackend.professional.photo.model.BusinessPhotoType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * BusinessPhotoRepository es un contrato interno del modulo profesionales / fotos / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
public interface BusinessPhotoRepository extends JpaRepository<BusinessPhoto, Long> {
    List<BusinessPhoto> findByProfessional_IdInAndTypeInOrderByProfessional_IdAscCreatedAtAsc(
        Collection<Long> professionalIds,
        Collection<BusinessPhotoType> types
    );

    List<BusinessPhoto> findByProfessional_IdAndTypeInOrderByCreatedAtAsc(
        Long professionalId,
        Collection<BusinessPhotoType> types
    );

    void deleteByProfessional_IdAndType(Long professionalId, BusinessPhotoType type);

    List<BusinessPhoto> findByProfessional_Id(Long professionalId);

    void deleteByProfessional_Id(Long professionalId);
}
