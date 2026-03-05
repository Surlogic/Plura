package com.plura.plurabackend.professional.photo.repository;

import com.plura.plurabackend.professional.photo.model.BusinessPhoto;
import com.plura.plurabackend.professional.photo.model.BusinessPhotoType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessPhotoRepository extends JpaRepository<BusinessPhoto, Long> {
    List<BusinessPhoto> findByProfessional_IdAndTypeInOrderByCreatedAtAsc(
        Long professionalId,
        Collection<BusinessPhotoType> types
    );

    void deleteByProfessional_IdAndType(Long professionalId, BusinessPhotoType type);
}
