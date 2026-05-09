package com.plura.plurabackend.usuario.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.usuario.notification.dto.ClientPushTokenUpsertRequest;
import com.plura.plurabackend.usuario.notification.model.ClientPushDevice;
import com.plura.plurabackend.usuario.notification.repository.ClientPushDeviceRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * Tests de funciones del cliente final / notificaciones, bandejas y emails.
 * Cubren escenarios de cliente push token servicio para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class ClientPushTokenServiceTest {

    private final ClientPushDeviceRepository clientPushDeviceRepository = mock(ClientPushDeviceRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final ClientPushTokenService service = new ClientPushTokenService(
        clientPushDeviceRepository,
        userRepository
    );

    /**
     * Escenario: debe ignore faltante device cuando disabling token.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldIgnoreMissingDeviceWhenDisablingToken() {
        when(clientPushDeviceRepository.findByPushToken("ExponentPushToken[abc]")).thenReturn(Optional.empty());

        service.sync(42L, new ClientPushTokenUpsertRequest("ExponentPushToken[abc]", "android", false));

        verify(userRepository, never()).findByIdAndDeletedAtIsNull(any());
        verify(clientPushDeviceRepository, never()).save(any());
    }

    /**
     * Escenario: debe persist enabled device for existente usuario.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldPersistEnabledDeviceForExistingUser() {
        User user = sampleUser();
        when(clientPushDeviceRepository.findByPushToken("ExponentPushToken[abc]")).thenReturn(Optional.empty());
        when(userRepository.findByIdAndDeletedAtIsNull(42L)).thenReturn(Optional.of(user));

        service.sync(42L, new ClientPushTokenUpsertRequest("ExponentPushToken[abc]", "android", true));

        verify(clientPushDeviceRepository).save(any(ClientPushDevice.class));
    }

    /**
     * Escenario: debe disable existente device sin changing token.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldDisableExistingDeviceWithoutChangingToken() {
        User user = sampleUser();
        ClientPushDevice existingDevice = new ClientPushDevice();
        existingDevice.setPushToken("ExponentPushToken[abc]");
        existingDevice.setPlatform("ANDROID");
        existingDevice.setEnabled(true);
        when(clientPushDeviceRepository.findByPushToken("ExponentPushToken[abc]")).thenReturn(Optional.of(existingDevice));
        when(userRepository.findByIdAndDeletedAtIsNull(42L)).thenReturn(Optional.of(user));

        service.sync(42L, new ClientPushTokenUpsertRequest("ExponentPushToken[abc]", "android", false));

        assertEquals(Boolean.FALSE, existingDevice.getEnabled());
        assertEquals("ANDROID", existingDevice.getPlatform());
        verify(clientPushDeviceRepository).save(existingDevice);
    }

    private User sampleUser() {
        User user = new User();
        user.setId(42L);
        user.setFullName("Cliente Test");
        user.setEmail("cliente@test.com");
        user.setPassword("secret");
        user.setRole(UserRole.USER);
        return user;
    }
}
